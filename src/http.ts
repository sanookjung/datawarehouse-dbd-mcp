#!/usr/bin/env bun
/**
 * HTTP wrapper for the DBD DataWarehouse MCP server.
 *
 * Exposes the same tools as the stdio MCP server over plain HTTP so that
 * n8n (and any other HTTP client) can reach DBD without speaking MCP. It
 * reuses the exact session bootstrap (Incapsula WAF + JWT) and envelope
 * decryption that the MCP path uses — every request goes through the same
 * `tools[].handler`, so behaviour is identical to calling the MCP tool.
 *
 * Run:  bun run src/http.ts            (defaults: host 0.0.0.0, port 8787)
 *       DBD_HTTP_PORT=9000 bun run src/http.ts
 *       DBD_HTTP_TOKEN=secret bun run src/http.ts   (require ?token= or X-Auth)
 *
 * Endpoints:
 *   GET  /health                       → { ok: true }
 *   GET  /tools                        → list of available tool names
 *   GET  /profile/:juristicId          → shortcut for get_juristic_profile
 *   GET  /tool/:name?arg=val&...       → call any tool with query args
 *   POST /tool/:name   { ...args }     → call any tool with a JSON body
 *
 * Auth (optional): if DBD_HTTP_TOKEN is set, every request must supply it
 * via `?token=` or the `X-Auth-Token` header. Intended for LAN use behind
 * your own network; set a token if exposing beyond localhost.
 */
import { tools } from "./tools.ts";
import { warmUp } from "./session.ts";

const PORT = Number(process.env.DBD_HTTP_PORT ?? 8787);
const HOST = process.env.DBD_HTTP_HOST ?? "0.0.0.0";
const TOKEN = process.env.DBD_HTTP_TOKEN ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function authed(req: Request, url: URL): boolean {
  if (!TOKEN) return true;
  const supplied = url.searchParams.get("token") ?? req.headers.get("x-auth-token") ?? "";
  return supplied === TOKEN;
}

/** Coerce a query-string value to the type the tool's schema expects. */
function coerceArgs(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "token") continue;
    // Numeric-looking values become numbers (fiscalYear, page, etc.)
    if (/^-?\d+$/.test(v)) out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<Response> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return json({ error: `unknown tool: ${name}`, available: tools.map((t) => t.name) }, 404);
  try {
    const input = tool.inputSchema.parse(args);
    const result = await tool.handler(input);
    return json({ ok: true, tool: name, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Validation errors (bad/short id) are 400; everything else 502 (upstream)
    const status = /หลัก|invalid|required|expected|regex/i.test(msg) ? 400 : 502;
    return json({ ok: false, tool: name, error: msg }, status);
  }
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") return json({ ok: true, service: "dbd-http", tools: tools.length });

    if (!authed(req, url)) return json({ error: "unauthorized" }, 401);

    if (path === "/tools") return json({ tools: tools.map((t) => ({ name: t.name, description: t.description })) });

    // GET /profile/:id  → get_juristic_profile shortcut
    const profileMatch = path.match(/^\/profile\/(\d{13})$/);
    if (profileMatch) return callTool("get_juristic_profile", { juristicId: profileMatch[1] });

    // /tool/:name  (GET query args or POST JSON body)
    const toolMatch = path.match(/^\/tool\/([a-z_]+)$/);
    if (toolMatch) {
      const name = toolMatch[1]!;
      let args: Record<string, unknown>;
      if (req.method === "POST") {
        try {
          args = (await req.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid JSON body" }, 400);
        }
      } else {
        args = coerceArgs(Object.fromEntries(url.searchParams));
      }
      return callTool(name, args);
    }

    return json({ error: "not found", endpoints: ["/health", "/tools", "/profile/:id", "/tool/:name"] }, 404);
  },
});

// Warm the session in the background so the first real request is fast.
warmUp().catch((e) => console.error("[dbd-http] warmUp failed (will retry on first call):", e?.message ?? e));

console.error(`[dbd-http] listening on http://${HOST}:${PORT}  (auth: ${TOKEN ? "on" : "off"})`);
void server;
