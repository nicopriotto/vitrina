import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, orders, products, stores, type Store } from "@/lib/db";
import { executeTool, filterProducts, tools as storeTools, type ToolResult } from "@/lib/agent-tools";
import { getCatalog } from "@/lib/stores";

/**
 * One MCP for buyers: "Vitrina". A buyer adds it once to their assistant and can shop every
 * store that joined Vitrina. Each call is routed to the store that owns the product, so the
 * per-store tools (the store's own PayPal payee, server-side totals, wire log) stay the single source of truth.
 */

async function readyStores(): Promise<Store[]> {
  return getDb().select().from(stores).where(eq(stores.status, "ready"));
}

async function storeOfProduct(productId: string): Promise<Store | null> {
  const [row] = await getDb().select({ s: stores }).from(products).innerJoin(stores, eq(stores.id, products.storeId)).where(eq(products.id, productId));
  return row?.s ?? null;
}

async function storeOfOrder(orderId: string): Promise<Store | null> {
  const [row] = await getDb().select({ s: stores }).from(orders).innerJoin(stores, eq(stores.id, orders.storeId)).where(eq(orders.id, orderId));
  return row?.s ?? null;
}

const storeTool = (name: string) => storeTools.find((t) => t.name === name)!;

const searchInput = z.object({
  query: z.string().default("").describe("Free text, e.g. 'black t-shirt'"),
  max_price: z.number().positive().optional().describe("Maximum price in USD"),
  size: z.string().optional().describe("Size, e.g. 'M'"),
  color: z.string().optional().describe("Color, e.g. 'black'"),
  limit: z.number().int().min(1).max(10).optional().describe("Max results (default 5)"),
});
const productInput = z.object({ product_id: z.string().uuid() });
const checkoutInput = storeTool("create_checkout").input;
const statusInput = storeTool("get_order_status").input;

type MarketTool = { name: string; description: string; input: z.ZodObject<any>; run: (input: any) => Promise<ToolResult> };

export const marketplaceTools: MarketTool[] = [
  {
    name: "list_stores",
    description: "List the independent stores you can shop through Vitrina, with a short description of each.",
    input: z.object({}),
    async run() {
      const list = (await readyStores()).map((s) => ({ store: s.name, description: s.description, url: s.sourceUrl }));
      return { ok: true, data: { stores: list }, text: list.map((s) => `- ${s.store}: ${s.description}`).join("\n") || "No stores yet." };
    },
  },
  {
    name: "search_products",
    description:
      "Search every Vitrina store at once by text and optional filters (max_price in USD, size, color). Each result says which store sells it. Always call this before recommending anything; never invent products.",
    input: searchInput,
    async run(input: z.infer<typeof searchInput>) {
      const limit = input.limit ?? 5;
      const hits: { store: Store; result: ReturnType<typeof filterProducts>["results"][number]; rank: number }[] = [];
      for (const store of await readyStores()) {
        const { results, usedFallback } = filterProducts(await getCatalog(store.id), input.query, input, limit);
        if (usedFallback) continue;
        results.forEach((r, i) => hits.push({ store, result: r, rank: i }));
      }
      const top = hits.sort((a, b) => a.rank - b.rank).slice(0, limit);
      // each store sees, in its own wire log, the searches that surfaced its products
      const touched = new Map(top.map((h) => [h.store.id, h.store]));
      for (const s of touched.values()) await executeTool({ store: s, channel: "mcp" }, "search_products", input);
      const found = top.map(({ store, result }) => ({
        store: store.name,
        product_id: result.product.id,
        name: result.product.name,
        price_usd: Number(result.product.price),
        image_url: result.product.imageUrl,
        variants: (result.variants.length ? result.variants : result.product.variants.filter((v) => v.inStock)).map((v) => ({
          id: v.id,
          label: v.label,
          price_usd: Number(v.priceOverride ?? result.product.price),
        })),
      }));
      const text = found.length
        ? found
            .map((p) => `- ${p.name} from ${p.store}: $${p.price_usd.toFixed(2)} (id: ${p.product_id}); variants: ${p.variants.map((v) => `${v.label} [${v.id}]`).join(", ") || "none"}`)
            .join("\n")
        : "No in-stock products match these filters.";
      return { ok: true, data: { products: found }, text };
    },
  },
  {
    name: "get_product",
    description: "Get full details of one product from any Vitrina store, including all variants.",
    input: productInput,
    async run(input: z.infer<typeof productInput>) {
      const store = await storeOfProduct(input.product_id);
      if (!store) return { ok: false, data: null, text: "Product not found." };
      return executeTool({ store, channel: "mcp" }, "get_product", input);
    },
  },
  {
    name: "create_checkout",
    description: `${storeTool("create_checkout").description} All items must come from the same store; the payment goes straight to that store's PayPal account.`,
    input: checkoutInput,
    async run(input: { items: { product_id: string }[] }) {
      const owners = await Promise.all(input.items.map((i) => storeOfProduct(i.product_id)));
      if (owners.some((s) => !s)) return { ok: false, data: null, text: "One of the products was not found." };
      if (new Set(owners.map((s) => s!.id)).size > 1) return { ok: false, data: null, text: "These items come from different stores. Create one checkout per store." };
      return executeTool({ store: owners[0]!, channel: "mcp" }, "create_checkout", input);
    },
  },
  {
    name: "get_order_status",
    description: storeTool("get_order_status").description,
    input: statusInput,
    async run(input: { order_id: string }) {
      const store = await storeOfOrder(input.order_id);
      if (!store) return { ok: false, data: null, text: "Order not found." };
      return executeTool({ store, channel: "mcp" }, "get_order_status", input);
    },
  },
];

export async function runMarketplaceTool(name: string, args: unknown): Promise<ToolResult> {
  const t = marketplaceTools.find((x) => x.name === name);
  if (!t) return { ok: false, data: null, text: `Unknown tool "${name}".` };
  const parsed = t.input.safeParse(args ?? {});
  if (!parsed.success) return { ok: false, data: null, text: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  try {
    return await t.run(parsed.data);
  } catch (e) {
    console.error(`[vitrina-mcp:${name}]`, e);
    return { ok: false, data: null, text: `Tool ${name} failed.` };
  }
}
