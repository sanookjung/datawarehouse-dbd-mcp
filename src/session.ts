/**
 * DBD session: bootstrap with a real Chromium once to obtain Incapsula WAF
 * cookies and a fresh JWT, then expose a plain Bun fetch wrapper for every
 * subsequent /api/ call.
 *
 * The bootstrap path is the only place Playwright is touched. Once cookies
 * are warm, off-browser fetches succeed for hours, so we cache the session
 * and only re-bootstrap when something breaks or the JWT can no longer be
 * refreshed via /api/refresh.
 */
import { chromium, type Browser, type BrowserContext } from "playwright";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { decryptEnvelope, type Envelope } from "./crypto.ts";

const BASE_URL = "https://datawarehouse.dbd.go.th";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const CACHE_FILE = join(process.cwd(), ".session-cache.json");
const BOOTSTRAP_COOLDOWN_MS = 60_000;
let lastBootstrapFailureTime = 0;

interface SessionState {
  cookieHeader: string;
  idToken: string;
  tokenExp: number; // unix seconds
}

let state: SessionState | null = null;
let bootstrapInflight: Promise<SessionState> | null = null;

function loadCachedSession(): SessionState | null {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      if (data && data.cookieHeader && data.idToken && data.tokenExp) {
        return data;
      }
    }
  } catch {
    // Ignore read/parse errors
  }
  return null;
}

function saveCachedSession(s: SessionState) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(s, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

function parseJwtExp(jwt: string): number {
  const part = jwt.split(".")[1] ?? "";
  const pad = "===".slice((part.length + 3) % 4);
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return JSON.parse(atob(b64)).exp ?? 0;
  } catch {
    return 0;
  }
}

async function bootstrap(): Promise<SessionState> {
  const now = Date.now();
  if (now - lastBootstrapFailureTime < BOOTSTRAP_COOLDOWN_MS) {
    const waitTime = BOOTSTRAP_COOLDOWN_MS - (now - lastBootstrapFailureTime);
    console.warn(`[Session] Bootstrap on cooldown. Waiting ${Math.round(waitTime / 1000)}s to protect IP...`);
    await new Promise((r) => setTimeout(r, waitTime));
  }

  let browser: Browser | null = null;
  let ctx: BrowserContext | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      // --disable-http2: DBD's Incapsula edge rejects headless Chromium's HTTP/2
      // handshake (ERR_HTTP2_PROTOCOL_ERROR). Forcing HTTP/1.1 lets the WAF JS
      // challenge complete. (local fix, 2026-06)
      args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-http2"],
    });
    ctx = await browser.newContext({
      userAgent: UA,
      locale: "th-TH",
      viewport: { width: 1366, height: 800 },
      extraHTTPHeaders: { "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7" },
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["th-TH", "th", "en-US", "en"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });
    const page = await ctx.newPage();

    // Use a robust retry loop for the initial page load
    const maxPageAttempts = 3;
    let cookiesWarm = false;
    for (let attempt = 1; attempt <= maxPageAttempts; attempt++) {
      try {
        // Use "commit" so we can check for Incapsula challenge cookies immediately
        await page.goto(BASE_URL + "/", { waitUntil: "commit", timeout: 20_000 });
        
        // Poll for Incapsula session/visid cookies which indicate WAF challenge resolved
        for (let i = 0; i < 30; i++) {
          const currentCookies = await ctx.cookies();
          const hasIncap = currentCookies.some(c => c.name.startsWith("incap_ses") || c.name.startsWith("visid_incap"));
          if (hasIncap) {
            cookiesWarm = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        if (cookiesWarm) break;
        throw new Error("WAF Incapsula cookies did not appear in context");
      } catch (err) {
        if (attempt === maxPageAttempts) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    if (!cookiesWarm) throw new Error("Incapsula cookies not set after load attempts");

    // Let the network settle. Some networks (e.g. a freshly-challenged IP)
    // need the Incapsula JS challenge to fully run before /api/refresh is
    // accepted — domcontentloaded alone can be too early and yields a 403.
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => null);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);

    // Force a fresh idToken via /api/refresh from within the page so the
    // Incapsula JS challenge has time to settle the cookie jar. Retry a few
    // times IN-PAGE (no new browser launch, so the WAF isn't hit harder):
    // the first call right after load can 403 while the challenge settles.
    let idToken = "";
    let lastStatus = 0;
    for (let attempt = 1; attempt <= 4; attempt++) {
      const refresh = await page.evaluate(async () => {
        const r = await fetch("/api/refresh", { method: "POST", credentials: "include" });
        return { status: r.status, body: await r.text() };
      });
      lastStatus = refresh.status;
      if (refresh.status === 200) {
        idToken = JSON.parse(refresh.body).idToken;
        break;
      }
      // Give the Incapsula challenge more time to settle before retrying.
      await page.waitForTimeout(2500 * attempt);
    }
    if (!idToken) throw new Error(`bootstrap refresh failed: ${lastStatus}`);

    const cookies = await ctx.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    return { cookieHeader, idToken, tokenExp: parseJwtExp(idToken) };
  } catch (err) {
    lastBootstrapFailureTime = Date.now();
    throw err;
  } finally {
    await ctx?.close().catch(() => null);
    await browser?.close().catch(() => null);
  }
}

async function ensureSession(): Promise<SessionState> {
  if (state && state.tokenExp - 60 > Date.now() / 1000) return state;

  const cached = loadCachedSession();
  if (cached && cached.tokenExp - 60 > Date.now() / 1000) {
    state = cached;
    return cached;
  }

  if (bootstrapInflight) return bootstrapInflight;
  bootstrapInflight = bootstrap().then((s) => {
    state = s;
    saveCachedSession(s);
    bootstrapInflight = null;
    return s;
  });
  return bootstrapInflight;
}

async function refreshToken(): Promise<void> {
  if (!state) return;
  const r = await fetch(BASE_URL + "/api/refresh", {
    method: "POST",
    headers: baseHeaders(state.cookieHeader, state.idToken),
  });
  if (r.status !== 200) {
    state = null;
    try {
      if (existsSync(CACHE_FILE)) unlinkSync(CACHE_FILE);
    } catch {}
    return;
  }
  const setCookie = r.headers.get("set-cookie");
  if (setCookie) state.cookieHeader = mergeSetCookie(state.cookieHeader, setCookie);
  const body = (await r.json()) as { idToken: string };
  state.idToken = body.idToken;
  state.tokenExp = parseJwtExp(body.idToken);
  saveCachedSession(state);
}

function mergeSetCookie(existing: string, setCookie: string): string {
  // Naive merge: extract name=value pairs from Set-Cookie and update existing.
  const map = new Map<string, string>();
  for (const kv of existing.split("; ").filter(Boolean)) {
    const [k, ...rest] = kv.split("=");
    if (k) map.set(k, rest.join("="));
  }
  for (const pair of setCookie.split(/,(?=\s*[A-Za-z0-9_-]+=)/)) {
    const first = pair.split(";")[0]?.trim() ?? "";
    const [k, ...rest] = first.split("=");
    if (k) map.set(k, rest.join("="));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function baseHeaders(cookieHeader: string, idToken: string): Record<string, string> {
  return {
    "user-agent": UA,
    "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
    accept: "application/json",
    "content-type": "application/json",
    referer: BASE_URL + "/",
    origin: BASE_URL,
    authorization: `Bearer ${idToken}`,
    cookie: cookieHeader,
  };
}

export interface ApiCallOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

/**
 * Issue a request against /api/... and return the decrypted JSON. Handles
 * session bootstrap, JWT refresh, and envelope decryption transparently.
 */
export async function apiCall<T = unknown>(path: string, opts: ApiCallOptions = {}): Promise<T> {
  if (!path.startsWith("/")) path = "/" + path;
  const method = opts.method ?? (opts.body ? "POST" : "GET");

  // Build query string
  let url = path;
  if (opts.query) {
    const qs = Object.entries(opts.query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  return doApi<T>(url, method, opts.body);
}

async function doApi<T>(path: string, method: string, body: unknown, retry = true): Promise<T> {
  let s = await ensureSession();
  // Proactive token refresh if close to expiry
  if (s.tokenExp - 60 <= Date.now() / 1000) {
    await refreshToken().catch(() => null);
    s = await ensureSession();
  }

  const res = await fetch(BASE_URL + path, {
    method,
    headers: baseHeaders(s.cookieHeader, s.idToken),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    if (!retry) throw new Error(`auth failed: ${res.status}`);
    // Re-bootstrap and try once more
    state = null;
    try {
      if (existsSync(CACHE_FILE)) unlinkSync(CACHE_FILE);
    } catch {}
    return doApi<T>(path, method, body, false);
  }
  if (res.status >= 400) {
    const txt = await res.text();
    throw new Error(`api ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }

  // Update cookies if server rotated them
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) s.cookieHeader = mergeSetCookie(s.cookieHeader, setCookie);

  const isEncrypted = (res.headers.get("x-encrypted") ?? "").toLowerCase() === "true";
  const text = await res.text();
  if (!text) return null as T;
  const json = JSON.parse(text);
  if (isEncrypted) {
    return decryptEnvelope<T>(json as Envelope, path.split("?")[0]!, s.idToken);
  }
  return json as T;
}

/** Eagerly bootstrap so the first MCP tool call is fast. */
export function warmUp(): Promise<void> {
  return ensureSession().then(() => void 0);
}
