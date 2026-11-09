import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";
config({ path: ".env.local" });

vi.mock("@/lib/paypal", async () => {
  const actual = await vi.importActual<typeof import("@/lib/paypal")>("@/lib/paypal");
  return {
    ...actual,
    createOrder: vi.fn(async (input: any) => ({
      id: `PP-${input.orderId.slice(0, 8)}`,
      status: "PAYER_ACTION_REQUIRED",
      approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=TEST",
      payerEmail: null,
      raw: input,
    })),
    getOrder: vi.fn(async (id: string) => ({ id, status: "CREATED", approveUrl: null, payerEmail: null, raw: {} })),
    captureOrder: vi.fn(),
  };
});

import { eq } from "drizzle-orm";
import { filterProducts, executeTool, llmTools, searchTerms } from "@/lib/agent-tools";
import * as paypal from "@/lib/paypal";
import { getDb, stores, products, variants, orders } from "@/lib/db";
import type { CatalogProduct } from "@/lib/stores";

const mk = (over: Partial<CatalogProduct>): CatalogProduct =>
  ({ id: "x", storeId: "s", externalUrl: null, name: "N", description: "", imageUrl: null, price: "10.00", originalPrice: null, originalCurrency: null, inStock: true, createdAt: new Date(), variants: [], ...over }) as CatalogProduct;
const v = (id: string, color: string, size: string, inStock = true, priceOverride: string | null = null) =>
  ({ id, productId: "x", label: `${color} / ${size}`, attributes: { color, size }, priceOverride, inStock });

describe("search filtering (pure)", () => {
  const tee = mk({ id: "tee", name: "Classic Tee", price: "32.30", variants: [v("1", "Black", "M"), v("2", "Black", "L", false), v("3", "White", "M")] });
  const hoodie = mk({ id: "hoodie", name: "Essential Hoodie", price: "83.30", variants: [v("4", "Black", "M")] });
  const cap = mk({ id: "cap", name: "Dad Cap", price: "20.40", variants: [] });
  const catalog = [tee, hoodie, cap];

  it("expands synonyms (t-shirt -> tee)", () => {
    expect(searchTerms("a black t-shirt")).toContain("tee");
  });
  it("applies color, size and max_price to in-stock variants", () => {
    const { results } = filterProducts(catalog, "t-shirt", { color: "black", size: "M", max_price: 40 });
    expect(results).toHaveLength(1);
    expect(results[0].product.id).toBe("tee");
    expect(results[0].variants.map((x) => x.id)).toEqual(["1"]);
  });
  it("excludes sold-out sizes and over-budget products", () => {
    expect(filterProducts(catalog, "tee", { size: "L" }).results).toHaveLength(0);
    expect(filterProducts(catalog, "hoodie", { max_price: 40 }).results).toHaveLength(0);
  });
  it("falls back to filter-only results when text does not match", () => {
    const r = filterProducts(catalog, "unicorn", { max_price: 25 });
    expect(r.usedFallback).toBe(true);
    expect(r.results[0].product.id).toBe("cap");
  });
});

describe("tool schemas", () => {
  it("exposes the 5 tools as JSON Schema", () => {
    expect(llmTools().map((t) => t.name)).toEqual(["get_store_info", "search_products", "get_product", "create_checkout", "get_order_status"]);
  });
  it("create_checkout tells the agent a human must approve", () => {
    expect(llmTools().find((t) => t.name === "create_checkout")!.description).toMatch(/human buyer must open approve_url/);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("tools against the database (PayPal mocked)", () => {
  let store: typeof stores.$inferSelect;
  let teeId: string;
  let blackM: string;
  let blackL: string;

  beforeAll(async () => {
    const db = getDb();
    [store] = await db.insert(stores).values({ slug: `test-${Date.now()}`, name: "Test Store", sourceUrl: "http://x.test", payeeEmail: "m@x.test", status: "ready" }).returning();
    const [p] = await db.insert(products).values({ storeId: store.id, name: "Classic Tee", description: "cotton tee", price: "32.30" }).returning();
    teeId = p.id;
    const rows = await db.insert(variants).values([
      { productId: p.id, label: "Black / M", attributes: { color: "Black", size: "M" }, inStock: true },
      { productId: p.id, label: "Black / L", attributes: { color: "Black", size: "L" }, inStock: false },
    ]).returning();
    blackM = rows[0].id;
    blackL = rows[1].id;
  });

  afterAll(async () => {
    await getDb().delete(stores).where(eq(stores.id, store.id));
  });

  const ctx = () => ({ store, channel: "mcp" as const });

  it("search_products finds the black M tee", async () => {
    const r = await executeTool(ctx(), "search_products", { query: "black t-shirt", size: "M", max_price: 40 });
    expect(r.ok).toBe(true);
    expect((r.data as any).products[0].name).toBe("Classic Tee");
  });

  it("create_checkout computes the total server-side and stores a CREATED order", async () => {
    const r = await executeTool(ctx(), "create_checkout", { items: [{ product_id: teeId, variant_id: blackM, quantity: 2 }] });
    expect(r.ok).toBe(true);
    const d = r.data as any;
    expect(d.total_usd).toBe("64.60");
    expect(d.approve_url).toContain("paypal.com");
    expect(paypal.createOrder).toHaveBeenCalled();
    const [row] = await getDb().select().from(orders).where(eq(orders.id, d.order_id));
    expect(row.status).toBe("CREATED");
    expect(row.channel).toBe("mcp");

    const status = await executeTool(ctx(), "get_order_status", { order_id: d.order_id });
    expect(status.ok).toBe(true);
    expect((status.data as any).status).toBe("CREATED");
  });

  it("rejects sold-out variants, missing variants and bad ids", async () => {
    expect((await executeTool(ctx(), "create_checkout", { items: [{ product_id: teeId, variant_id: blackL, quantity: 1 }] })).ok).toBe(false);
    expect((await executeTool(ctx(), "create_checkout", { items: [{ product_id: teeId, quantity: 1 }] })).text).toMatch(/needs a variant_id/);
    expect((await executeTool(ctx(), "get_product", { product_id: "nope" })).ok).toBe(false);
  });
});
