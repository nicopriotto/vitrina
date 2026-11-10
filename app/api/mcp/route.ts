import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { marketplaceTools, runMarketplaceTool } from "@/lib/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

function withCors(res: Response) {
  const headers = new Headers(res.headers);
  Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** The buyer-side MCP: every Vitrina store behind one endpoint. Stateless, like the per-store one. */
async function handle(req: Request) {
  const server = new McpServer({ name: "vitrina", version: "0.1.0" });
  for (const t of marketplaceTools) {
    server.registerTool(t.name, { description: t.description, inputSchema: t.input.shape }, async (args: unknown) => {
      const result = await runMarketplaceTool(t.name, args);
      return { content: [{ type: "text" as const, text: `${result.text}\n\n${JSON.stringify(result.data)}` }], isError: !result.ok };
    });
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return withCors(await transport.handleRequest(req));
}

export { handle as POST, handle as GET, handle as DELETE };
