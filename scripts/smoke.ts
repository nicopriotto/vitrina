/**
 * Smoke test against a running app (default http://localhost:3000):
 * ingest the mock store, search via the MCP endpoint, create a checkout and verify
 * that the PayPal sandbox order exists.
 *
 * Usage: pnpm smoke [--jsonld] [--payee=email]
 * Without an AI provider key the plain mock needs AI extraction, so it automatically uses
 * the structured-data path (?jsonld=1) instead.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { llmConfigured } from "../lib/llm";

const BASE = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const args = process.argv.slice(2);
const useJsonLd = args.includes("--jsonld") || !llmConfigured();
const payee = args.find((a) => a.startsWith("--payee="))?.split("=")[1] ?? process.env.SMOKE_PAYEE_EMAIL ?? "merchant@example.com";

function step(msg: string) {
  console.log(`\n> ${msg}`);
}
function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

let rpcId = 0;
/** JSON-RPC to an MCP endpoint: a store's (`/api/stores/<slug>/mcp`) or, with slug null, the shoppers' Vitrina MCP (`/api/mcp`). */
async function mcp(slug: string | null, method: string, params?: unknown) {
  const res = await fetch(slug ? `${BASE}/api/stores/${slug}/mcp` : `${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  const json = await res.json();
  if (json.error) fail(`MCP ${method} error: ${JSON.stringify(json.error)}`);
  return json.result;
}

/** Tool results are "human text\n\n{json}". */
function jsonPart(text: string) {
  return JSON.parse(text.slice(text.lastIndexOf("\n\n") + 2));
}

async function main() {
  step(`Ingesting mock store at ${BASE}/mock/lumen${useJsonLd ? "?jsonld=1 (structured data path)" : " (AI extraction path)"}`);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${BASE}/mock/lumen${useJsonLd ? "?jsonld=1" : ""}`, payeeEmail: payee }),
  });
  if (!res.ok) fail(`POST /api/stores -> ${res.status} ${await res.text()}`);
  const { slug } = await res.json();

  let store: any;
  for (let i = 0; i < 120; i++) {
    store = await (await fetch(`${BASE}/api/stores/${slug}`)).json();
    if (store.store.status !== "ingesting") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (store.store.status !== "ready") fail(`Ingestion ended as ${store.store.status}: ${store.store.errorMessage}`);
  console.log(`ok: ${store.products.length} products in ${((Date.now() - t0) / 1000).toFixed(1)}s (slug: ${slug})`);

  step("MCP tools/list");
  const list = await mcp(slug, "tools/list");
  console.log("ok:", list.tools.map((t: any) => t.name).join(", "));

  step("search_products: black t-shirt, size M, under $40");
  const search = await mcp(slug, "tools/call", { name: "search_products", arguments: { query: "black t-shirt", size: "M", color: "black", max_price: 40 } });
  const product = jsonPart(search.content[0].text).products[0];
  if (!product) fail("No product found for the demo query");
  console.log(`ok: ${product.name} $${product.price_usd}`);

  step("create_checkout (creates a real PayPal sandbox order)");
  const variant = product.variants[0];
  const co = await mcp(slug, "tools/call", { name: "create_checkout", arguments: { items: [{ product_id: product.id, variant_id: variant.id, quantity: 1 }] } });
  if (co.isError) fail(`create_checkout failed: ${co.content[0].text}`);
  const order = jsonPart(co.content[0].text);
  if (!order.paypal_order_id || !order.approve_url) fail("Missing PayPal order id / approve_url");
  console.log(`ok: PayPal order ${order.paypal_order_id}, total $${order.total_usd}`);
  console.log(`    approve_url: ${order.approve_url}`);

  step("get_order_status");
  const st = await mcp(slug, "tools/call", { name: "get_order_status", arguments: { order_id: order.order_id } });
  console.log("ok:", st.content[0].text.split("\n\n")[0]);

  step("Orders dashboard API");
  const orders = await (await fetch(`${BASE}/api/stores/${slug}/orders`)).json();
  if (!orders.orders.some((o: any) => o.id === order.order_id)) fail("Order missing from dashboard API");
  console.log(`ok: order #${order.order_id.slice(0, 8)} is listed`);

  step("Ship endpoint refuses an unpaid order");
  const ship = await fetch(`${BASE}/api/stores/${slug}/orders/${order.order_id}/ship`, { method: "POST" });
  if (ship.status !== 409) fail(`POST .../ship on an unpaid order -> ${ship.status}, expected 409`);
  console.log("ok: 409");

  step("Vitrina MCP for shoppers (/api/mcp): tools/list");
  const glist = await mcp(null, "tools/list");
  console.log("ok:", glist.tools.map((t: any) => t.name).join(", "));

  step("Vitrina MCP: search every store");
  const gs = await mcp(null, "tools/call", { name: "search_products", arguments: { query: "black t-shirt", size: "M", color: "black", max_price: 40 } });
  const hit = jsonPart(gs.content[0].text).products.find((p: any) => p.product_id === product.id);
  if (!hit) fail("The store's product is missing from the cross-store search");
  console.log(`ok: ${hit.name} from ${hit.store}`);

  step("Vitrina MCP: create_checkout is routed to the owning store");
  const gco = await mcp(null, "tools/call", { name: "create_checkout", arguments: { items: [{ product_id: hit.product_id, variant_id: hit.variants[0].id, quantity: 1 }] } });
  if (gco.isError) fail(`create_checkout failed: ${gco.content[0].text}`);
  const gorder = jsonPart(gco.content[0].text);
  const gst = await mcp(null, "tools/call", { name: "get_order_status", arguments: { order_id: gorder.order_id } });
  if (gst.isError) fail(`get_order_status failed: ${gst.content[0].text}`);
  const listed = await (await fetch(`${BASE}/api/stores/${slug}/orders`)).json();
  if (!listed.orders.some((o: any) => o.id === gorder.order_id)) fail("Order from the Vitrina MCP is missing from the store's dashboard");
  console.log(`ok: PayPal order ${gorder.paypal_order_id} in ${slug}'s dashboard`);
  console.log(`    approve_url: ${gorder.approve_url}`);

  step("Vitrina MCP: bad input is a tool error, not a crash");
  const bad = await mcp(null, "tools/call", { name: "get_product", arguments: { product_id: "00000000-0000-0000-0000-000000000000" } });
  if (!bad.isError) fail("Unknown product should be a tool error");
  console.log("ok:", bad.content[0].text.split("\n\n")[0]);
  console.log("\nSmoke test passed.");
}

main().catch((e) => fail(String(e)));
