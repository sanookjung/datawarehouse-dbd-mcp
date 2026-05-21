#!/usr/bin/env bun
/**
 * MCP server entry — exposes datawarehouse.dbd.go.th as a set of MCP tools.
 *
 * Transport: stdio. Tools defined in ./tools.ts. Session bootstrap is lazy:
 * the first tool call spins up a headless Chromium to obtain Incapsula
 * cookies + JWT, then all subsequent calls go through plain Bun fetch.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { tools } from "./tools.ts";

const server = new Server(
  { name: "datawarehouse-dbd-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: z.toJSONSchema(t.inputSchema),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`unknown tool: ${req.params.name}`);
  const input = tool.inputSchema.parse(req.params.arguments ?? {});
  const result = await tool.handler(input);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
// eslint-disable-next-line no-console
console.error("[datawarehouse-dbd-mcp] ready");
