import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";
config({ path: ".env.local" });

vi.mock("@/lib/paypal", async () => {
  const actual = await vi.importActual<typeof import("@/lib/paypal")>("@/lib/paypal");
  return {
    ...actual,
    createOrder: vi.fn(async (input: any) => ({ id: `PP-${input.orderId.slice(0, 8)}`, status: "PAYER_ACTION_REQUIRED", approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=TEST", payerEmail: null, shipping: null, raw: input })),
    getOrder: vi.fn(),
    captureOrder: vi.fn(),
  };
});

import { eq, inArray } from "drizzle-orm";
import * as paypal from "@/lib/paypal";
import { getDb, orders, products, stores, variants } from "@/lib/db";
import { runMarketplaceTool } from "@/lib/marketplace";
import { markShipped } from "@/lib/orders";

describe("toShipping (PayPal ship-to)", () => {
  it("reads the buyer's address from the purchase unit", () => {
    const a = paypal.toShipping({ shipping: { name: { full_name: "Sam Carter" }, address: { address_line_1: "88 Kent Ave", admin_area_2: "Brooklyn", admin_area_1: "NY", postal_code: "11249", country_code: "US" } } });
    expect(a).toEqual({ name: "Sam Carter", line1: "88 Kent Ave", line2: null, city: "Brooklyn", state: "NY", postalCode: "11249", country: "US" });
    expect(paypal.toShipping({})).toBeNull();
  });
});

describe.skipIf(!process.env.DATABASE_URL)("Vitrina MCP across stores (PayPal mocked)", () => {
  const ids: string[] = [];
  let tee: string;
  let teeBlackM: string;
  let mug: string;

  beforeAll(async () => {
    const db = getDb();
    const tag = Math.random().toString(36).slice(2, 7);
    const [a] = await db.insert(stores).values({ slug: `mk-a-${tag}`, name: "Lumen Studio", sourceUrl: "https://a.test", payeeEmail: "maya@a.test", status: "ready" }).returning();
    const [b] = await db.insert(stores).values({ slug: `mk-b-${tag}`, name: "Clay Corner", sourceUrl: "https://b.test", payeeEmail: "owner@b.test", status: "ready" }).returning();
    ids.push(a.id, b.id);
    const [p1] = await db.insert(products).values({ storeId: a.id, name: `Classic Tee ${tag}`, price: "32.00" }).returning();
    const [v1] = await db.insert(variants).values({ productId: p1.id, label: "Black / M", attributes: { color: "Black", size: "M" } }).returning();
    const [p2] = await db.insert(products).values({ storeId: b.id, name: `Stoneware Mug ${tag}`, price: "18.00" }).returning();
    tee = p1.id;
    teeBlackM = v1.id;
    mug = p2.id;
  });

  afterAll(async () => {
    if (ids.length) await getDb().delete(stores).where(inArray(stores.id, ids));
  });

  it("finds a product in any store and says which store sells it", async () => {
    const r = await runMarketplaceTool("search_products", { query: "tee", color: "black", size: "M", max_price: 40, limit: 10 });
    const hit = (r.data as any).products.find((p: any) => p.product_id === tee);
    expect(hit.store).toBe("Lumen Studio");
    expect(hit.variants[0].id).toBe(teeBlackM);
  });

  it("routes the checkout to the store that owns the product (its PayPal payee)", async () => {
    const r = await runMarketplaceTool("create_checkout", { items: [{ product_id: tee, variant_id: teeBlackM, quantity: 1 }] });
    expect(r.ok).toBe(true);
    const call = vi.mocked(paypal.createOrder).mock.calls.at(-1)![0];
    expect(call.store.payeeEmail).toBe("maya@a.test");
    const [o] = await getDb().select().from(orders).where(eq(orders.id, (r.data as any).order_id));
    expect(o.storeId).toBe(ids[0]);
    expect(o.channel).toBe("mcp");
  });

  it("marks only paid orders of its own store as shipped, once", async () => {
    const db = getDb();
    const [paid] = await db.insert(orders).values({ storeId: ids[0], status: "PAID", items: [], total: "32.00", channel: "mcp" }).returning();
    const [open] = await db.insert(orders).values({ storeId: ids[0], status: "CREATED", items: [], total: "32.00", channel: "mcp" }).returning();
    const first = await markShipped(paid.id, ids[0]);
    expect(first.ok && first.order.shippedAt).toBeTruthy();
    const again = await markShipped(paid.id, ids[0]);
    expect(again.ok && again.order.shippedAt?.getTime()).toBe(first.ok && first.order.shippedAt?.getTime());
    expect(await markShipped(open.id, ids[0])).toEqual({ ok: false, reason: "not_paid" });
    expect(await markShipped(paid.id, ids[1])).toEqual({ ok: false, reason: "not_found" });
  });

  it("refuses one checkout across two stores", async () => {
    const r = await runMarketplaceTool("create_checkout", { items: [{ product_id: tee, variant_id: teeBlackM, quantity: 1 }, { product_id: mug, quantity: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/different stores/);
  });
});
