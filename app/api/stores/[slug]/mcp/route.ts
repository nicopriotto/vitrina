import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { tools, executeTool } from "@/lib/agent-tools";
import { getStoreBySlug } from "@/lib/stores";

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

/** Stateless Streamable HTTP: a fresh server + transport for every request. */
async function handle(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || store.status !== "ready") {
    return withCors(
      Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "Store not found or not ready" }, id: null }, { status: 404 }),
    );
  }

  const server = new McpServer({ name: `vitrina-${store.slug}`, version: "0.1.0" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.input.shape },
      async (args: unknown) => {
        const result = await executeTool({ store, channel: "mcp" }, t.name, args);
        return {
          content: [{ type: "text" as const, text: `${result.text}\n\n${JSON.stringify(result.data)}` }],
          isError: !result.ok,
        };
      },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  return withCors(res);
}

export { handle as POST, handle as GET, handle as DELETE };
