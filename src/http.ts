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
 * Runtime-agnostic: built on node:http so it runs under BOTH bun (macOS) and
 * Node (Windows/beelink). On Windows, bun+Playwright cannot launch Chromium,
 * so the wrapper must run under Node there:
 *     node --import tsx src/http.ts
 * On macOS, either works:
 *     bun run src/http.ts
 *
 * Env:
 *   DBD_HTTP_PORT  (default 8787)
 *   DBD_HTTP_HOST  (default 0.0.0.0)
 *   DBD_HTTP_TOKEN (optional; if set, require ?token= or X-Auth-Token header)
 *
 * Endpoints:
 *   GET  /health                  → { ok: true }
 *   GET  /tools                   → list of available tools
 *   GET  /profile/:juristicId     → shortcut for get_juristic_profile
 *   GET  /tool/:name?arg=val&...  → call any tool with query args
 *   POST /tool/:name  { ...args } → call any tool with a JSON body
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tools } from "./tools.ts";
import { warmUp } from "./session.ts";

const PORT = Number(process.env.DBD_HTTP_PORT ?? 8787);
const HOST = process.env.DBD_HTTP_HOST ?? "0.0.0.0";
const TOKEN = process.env.DBD_HTTP_TOKEN ?? "";

interface Result {
  status: number;
  body: unknown;
}

function authed(searchParams: URLSearchParams, headers: IncomingMessage["headers"]): boolean {
  if (!TOKEN) return true;
  const supplied = searchParams.get("token") ?? (headers["x-auth-token"] as string | undefined) ?? "";
  return supplied === TOKEN;
}

/** Coerce query-string values to the types the tool schemas expect. */
function coerceArgs(searchParams: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of searchParams.entries()) {
    if (k === "token") continue;
    out[k] = /^-?\d+$/.test(v) ? Number(v) : v;
  }
  return out;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<Result> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { status: 404, body: { error: `unknown tool: ${name}`, available: tools.map((t) => t.name) } };
  try {
    const input = tool.inputSchema.parse(args);
    const result = await tool.handler(input);
    return { status: 200, body: { ok: true, tool: name, data: result } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /หลัก|invalid|required|expected|regex/i.test(msg) ? 400 : 502;
    return { status, body: { ok: false, tool: name, error: msg } };
  }
}

async function route(req: IncomingMessage, rawBody: string): Promise<Result> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? HOST}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/health") return { status: 200, body: { ok: true, service: "dbd-http", tools: tools.length } };

  if (!authed(url.searchParams, req.headers)) return { status: 401, body: { error: "unauthorized" } };

  if (path === "/tools") {
    return { status: 200, body: { tools: tools.map((t) => ({ name: t.name, description: t.description })) } };
  }

  const profileMatch = path.match(/^\/profile\/(\d{13})$/);
  if (profileMatch) return callTool("get_juristic_profile", { juristicId: profileMatch[1] });

  const toolMatch = path.match(/^\/tool\/([a-z_]+)$/);
  if (toolMatch) {
    const name = toolMatch[1]!;
    let args: Record<string, unknown>;
    if (req.method === "POST") {
      try {
        args = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
      } catch {
        return { status: 400, body: { error: "invalid JSON body" } };
      }
    } else {
      args = coerceArgs(url.searchParams);
    }
    return callTool(name, args);
  }

  return { status: 404, body: { error: "not found", endpoints: ["/health", "/tools", "/profile/:id", "/tool/:name"] } };
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c as Buffer));
  req.on("end", async () => {
    const rawBody = Buffer.concat(chunks).toString("utf-8");
    let result: Result;
    try {
      result = await route(req, rawBody);
    } catch (err) {
      result = { status: 500, body: { error: err instanceof Error ? err.message : String(err) } };
    }
    const payload = JSON.stringify(result.body, null, 2);
    res.writeHead(result.status, { "content-type": "application/json; charset=utf-8" });
    res.end(payload);
  });
});

server.listen(PORT, HOST, () => {
  console.error(`[dbd-http] listening on http://${HOST}:${PORT}  (auth: ${TOKEN ? "on" : "off"})`);
  // Warm the session so the first real request is fast.
  warmUp().catch((e) => console.error("[dbd-http] warmUp failed (will retry on first call):", e?.message ?? e));
});
