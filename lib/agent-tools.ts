import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { eq, and } from "drizzle-orm";
import { appUrl } from "@/lib/config";
import { getDb, orders, toolEvents, type OrderItem, type Store } from "@/lib/db";
import { calculateTotal, syncOrder } from "@/lib/orders";
import * as paypal from "@/lib/paypal";
import { getCatalog, type CatalogProduct } from "@/lib/stores";
import type { ToolDef } from "@/lib/llm";

/**
 * Single source of truth for the shopping tools. Both the MCP server and the
 * Playground chat call these exact functions.
 */

export type ToolContext = { store: Store; channel: "playground" | "mcp" };
export type ToolResult = { ok: boolean; data: unknown; text: string };

// ---------- pure helpers (unit tested) ----------

const SYNONYMS: Record<string, string[]> = {
  "t-shirt": ["tee"], tshirt: ["tee"], shirt: ["tee"], tee: ["tee"], remera: ["tee"], camiseta: ["tee"],
  sweatshirt: ["sweatshirt", "hoodie", "crewneck"], sweater: ["sweatshirt", "hoodie"], jumper: ["sweatshirt", "hoodie"],
  buzo: ["sweatshirt", "hoodie"], hoodie: ["hoodie"], hat: ["cap"], gorra: ["cap"], cap: ["cap"],
  bag: ["tote", "bag"], bolso: ["tote", "bag"], tote: ["tote"],
};
const STOP = new Set(["a", "an", "the", "i", "need", "want", "for", "in", "me", "some", "size", "color", "colour", "under", "below", "of", "and", "with", "to"]);

export function searchTerms(query: string): string[] {
  const words = query.toLowerCase().split(/[^a-z0-9áéíóúñ-]+/).filter((w) => w && !STOP.has(w));
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    (SYNONYMS[w] ?? []).forEach((s) => out.add(s));
  }
  return [...out];
}

type Filters = { max_price?: number; size?: string; color?: string };

export function effectivePrice(p: { price: string }, v?: { priceOverride: string | null }) {
  return Number(v?.priceOverride ?? p.price);
}

export function matchingVariants(p: CatalogProduct, f: Filters) {
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  if (!p.variants.length) {
    const ok = p.inStock && !f.size && !f.color && (f.max_price === undefined || Number(p.price) <= f.max_price);
    return ok ? [] : null;
  }
  return p.variants.filter((v) => {
    if (!v.inStock) return false;
    const attrs = v.attributes ?? {};
    if (f.size && norm(attrs.size) !== norm(f.size)) return false;
    if (f.color && !norm(attrs.color).includes(norm(f.color))) return false;
    if (f.max_price !== undefined && effectivePrice(p, v) > f.max_price) return false;
    return true;
  });
}

export function filterProducts(catalog: CatalogProduct[], query: string | undefined, f: Filters, limit = 5) {
  const terms = searchTerms(query ?? "");
  const scored = catalog
    .map((p) => {
      const hay = `${p.name} ${p.description}`.toLowerCase();
      const score = terms.filter((t) => hay.includes(t)).length;
      return { p, score, variants: matchingVariants(p, f) };
    })
    // matchingVariants returns null when a no-variant product fails the filters
    .filter((x) => x.variants !== null && (x.variants.length > 0 || x.p.variants.length === 0));
  const matched = terms.length ? scored.filter((x) => x.score > 0) : scored;
  // Only fall back to filter-only results when the text matches nothing in the whole catalog
  // (e.g. an unknown word), not when filters like max_price excluded the text matches.
  const textMatchesAnything = catalog.some((p) => terms.some((t) => `${p.name} ${p.description}`.toLowerCase().includes(t)));
  const usedFallback = terms.length > 0 && matched.length === 0 && scored.length > 0 && !textMatchesAnything;
  const pick = (usedFallback || terms.length === 0 ? scored : matched).sort((a, b) => b.score - a.score).slice(0, limit);
  return { results: pick.map((x) => ({ product: x.p, variants: x.variants ?? [] })), usedFallback };
}

function serializeProduct(p: CatalogProduct, vs: CatalogProduct["variants"]) {
  return {
    id: p.id,
    name: p.name,
    description: p.description.slice(0, 240),
    price_usd: Number(p.price),
    original_price: p.originalPrice ? `${p.originalCurrency} ${Number(p.originalPrice).toLocaleString("en-US")}` : null,
    image_url: p.imageUrl,
    url: p.externalUrl,
    in_stock: p.inStock,
    variants: vs.map((v) => ({
      id: v.id,
      label: v.label,
      attributes: v.attributes,
      price_usd: effectivePrice(p, v),
      in_stock: v.inStock,
    })),
  };
}

// ---------- tool definitions ----------

const emptyInput = z.object({});

const searchInput = z.object({
  query: z.string().describe("Free text, e.g. 't-shirt' or 'hoodie'. Use an empty string to list everything.").default(""),
  max_price: z.number().positive().optional().describe("Maximum price in USD"),
  size: z.string().optional().describe("Size, e.g. 'M'"),
  color: z.string().optional().describe("Color, e.g. 'black'"),
  limit: z.number().int().min(1).max(10).optional().describe("Max results (default 5)"),
});

const getProductInput = z.object({ product_id: z.string().uuid().describe("Product id returned by search_products") });

const checkoutInput = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().optional().describe("Required when the product has variants (size/color)"),
        quantity: z.number().int().min(1).max(10).default(1),
      }),
    )
    .min(1),
  buyer_note: z.string().max(300).optional(),
});

const orderStatusInput = z.object({ order_id: z.string().uuid().describe("order_id returned by create_checkout") });

type ToolDefinition<S extends z.ZodObject<any>> = {
  name: string;
  description: string;
  input: S;
  run: (ctx: ToolContext, input: z.infer<S>) => Promise<ToolResult>;
};

function tool<S extends z.ZodObject<any>>(t: ToolDefinition<S>) {
  return t;
}

export const tools = [
  tool({
    name: "get_store_info",
    description: "Get the store's name, description, currency and number of products.",
    input: emptyInput,
    run: async ({ store }) => {
      const catalog = await getCatalog(store.id);
      const data = { name: store.name, description: store.description, currency: store.currency, product_count: catalog.length };
      return { ok: true, data, text: `${data.name}: ${data.description} (${data.product_count} products, prices in ${data.currency})` };
    },
  }),

  tool({
    name: "search_products",
    description:
      "Search this store's catalog by text and optional filters (max_price in USD, size, color). Returns matching products with in-stock variants, prices, images and ids. Always call this before recommending anything; never invent products.",
    input: searchInput,
    run: async ({ store }, input) => {
      const catalog = await getCatalog(store.id);
      const { results, usedFallback } = filterProducts(catalog, input.query, input, input.limit ?? 5);
      const products = results.map((r) => serializeProduct(r.product, r.variants.length ? r.variants : r.product.variants.filter((v) => v.inStock)));
      const note = results.length === 0 ? "No in-stock products match these filters." : usedFallback ? "No exact text match; showing products that match the filters." : undefined;
      const text = products.length
        ? products
            .map((p) => `- ${p.name} — $${p.price_usd.toFixed(2)} (id: ${p.id}); variants: ${p.variants.map((v) => `${v.label} [${v.id}]`).join(", ") || "none"}`)
            .join("\n")
        : note!;
      return { ok: true, data: { products, note }, text: note && products.length ? `${note}\n${text}` : text };
    },
  }),

  tool({
    name: "get_product",
    description: "Get full details of one product including all variants and their availability.",
    input: getProductInput,
    run: async ({ store }, input) => {
      const p = (await getCatalog(store.id)).find((x) => x.id === input.product_id);
      if (!p) return { ok: false, data: null, text: "Product not found in this store." };
      const data = serializeProduct(p, p.variants);
      return { ok: true, data, text: `${data.name} — $${data.price_usd.toFixed(2)}\n${data.description}\nVariants: ${data.variants.map((v) => `${v.label}${v.in_stock ? "" : " (sold out)"} [${v.id}]`).join(", ") || "none"}` };
    },
  }),

  tool({
    name: "create_checkout",
    description:
      "Create a PayPal checkout for the chosen items. The total is calculated by the server. IMPORTANT: the agent cannot pay by itself. The human buyer must open approve_url (or press the PayPal button in the chat) to review and approve the payment. After sharing it, tell the user to approve and then use get_order_status to confirm.",
    input: checkoutInput,
    run: async (ctx, input) => {
      const catalog = await getCatalog(ctx.store.id);
      const lines: OrderItem[] = [];
      for (const it of input.items) {
        const p = catalog.find((x) => x.id === it.product_id);
        if (!p) return { ok: false, data: null, text: `Product ${it.product_id} not found in this store.` };
        let variant: CatalogProduct["variants"][number] | undefined;
        if (p.variants.length) {
          variant = p.variants.find((v) => v.id === it.variant_id);
          if (!variant) {
            return { ok: false, data: null, text: `"${p.name}" needs a variant_id. Options: ${p.variants.filter((v) => v.inStock).map((v) => `${v.label} [${v.id}]`).join(", ")}` };
          }
          if (!variant.inStock) return { ok: false, data: null, text: `"${p.name}" in ${variant.label} is sold out.` };
        } else if (!p.inStock) {
          return { ok: false, data: null, text: `"${p.name}" is sold out.` };
        }
        lines.push({
          productId: p.id,
          variantId: variant?.id ?? null,
          name: p.name,
          variantLabel: variant?.label ?? null,
          quantity: it.quantity,
          unitPrice: effectivePrice(p, variant).toFixed(2),
        });
      }

      const total = calculateTotal(lines);
      const orderId = crypto.randomUUID();
      const base = appUrl();
      const pp = await paypal.createOrder({
        orderId,
        store: ctx.store,
        items: lines.map((l) => ({ name: l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name, unitAmount: l.unitPrice, quantity: l.quantity })),
        total,
        returnUrl: `${base}/checkout/return?order=${orderId}`,
        cancelUrl: `${base}/checkout/cancel?order=${orderId}`,
      });

      await getDb().insert(orders).values({
        id: orderId,
        storeId: ctx.store.id,
        paypalOrderId: pp.id,
        status: "CREATED",
        items: lines,
        total,
        channel: ctx.channel,
      });

      const summary = lines.map((l) => `${l.quantity} × ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""} @ $${l.unitPrice}`).join("; ");
      const data = {
        order_id: orderId,
        paypal_order_id: pp.id,
        summary,
        items: lines,
        total_usd: total,
        currency: "USD",
        approve_url: pp.approveUrl,
        store_name: ctx.store.name,
        status: "CREATED",
      };
      return {
        ok: true,
        data,
        text: `Checkout created (order ${orderId}): ${summary}. Total $${total} USD. The buyer must approve the payment themselves by opening: ${pp.approveUrl}`,
      };
    },
  }),

  tool({
    name: "get_order_status",
    description:
      "Check the status of an order created with create_checkout (CREATED, APPROVED, PAID or FAILED). If the buyer approved the payment but it has not been captured yet, this captures it.",
    input: orderStatusInput,
    run: async ({ store }, input) => {
      const [existing] = await getDb().select().from(orders).where(and(eq(orders.id, input.order_id), eq(orders.storeId, store.id)));
      if (!existing) return { ok: false, data: null, text: "Order not found." };
      const order = (await syncOrder(existing.id)) ?? existing;
      const data = { order_id: order.id, status: order.status, total_usd: order.total, paid: order.status === "PAID" };
      const text =
        order.status === "PAID"
          ? `Paid. Order ${order.id} is confirmed (total $${order.total}).`
          : order.status === "CREATED"
            ? `Order ${order.id} is waiting for the buyer to approve the payment.`
            : `Order ${order.id} status: ${order.status}.`;
      return { ok: true, data, text };
    },
  }),
];

export type AnyTool = (typeof tools)[number];

export function toolByName(name: string): AnyTool | undefined {
  return tools.find((t) => t.name === name);
}

/** Best-effort audit trail shown live in the merchant UI ("wire log"). Never throws. */
async function logToolEvent(ctx: ToolContext, tool: string, args: unknown, result: ToolResult, ms: number) {
  try {
    await getDb().insert(toolEvents).values({
      storeId: ctx.store.id,
      tool,
      args: (args && typeof args === "object" ? args : {}) as Record<string, unknown>,
      ok: result.ok,
      ms,
      summary: result.text.replace(/\s+/g, " ").slice(0, 160),
      channel: ctx.channel,
    });
  } catch (e) {
    console.warn("[tool_events] log failed", e);
  }
}

/** Validate raw args with Zod, run the tool, and never throw. */
export async function executeTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<ToolResult> {
  const started = Date.now();
  const result = await runTool(ctx, name, rawArgs);
  if (toolByName(name)) await logToolEvent(ctx, name, rawArgs, result, Date.now() - started);
  return result;
}

async function runTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<ToolResult> {
  const t = toolByName(name);
  if (!t) return { ok: false, data: null, text: `Unknown tool "${name}".` };
  const parsed = t.input.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return { ok: false, data: null, text: `Invalid arguments for ${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  }
  try {
    return await (t.run as (c: ToolContext, i: unknown) => Promise<ToolResult>)(ctx, parsed.data);
  } catch (e) {
    console.error(`[tool:${name}]`, e);
    return { ok: false, data: null, text: `Tool ${name} failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

/** Tools in the generic JSON-Schema form that lib/llm.ts hands to whichever provider is configured. */
export function llmTools(): ToolDef[] {
  return tools.map((t) => {
    const schema = zodToJsonSchema(t.input, { $refStrategy: "none", target: "openApi3" }) as Record<string, unknown>;
    delete schema.$schema;
    return { name: t.name, description: t.description, parameters: schema };
  });
}
