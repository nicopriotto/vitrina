import { and, eq, isNull } from "drizzle-orm";
import { getDb, orders, type Order } from "@/lib/db";
import * as paypal from "@/lib/paypal";

/** Totals are computed server-side in integer cents. */
export function calculateTotal(lines: { unitPrice: string | number; quantity: number }[]): string {
  const cents = lines.reduce((acc, l) => acc + Math.round(Number(l.unitPrice) * 100) * l.quantity, 0);
  return (cents / 100).toFixed(2);
}

export function mapPayPalStatus(status: string): Order["status"] {
  switch (status) {
    case "COMPLETED":
      return "PAID";
    case "APPROVED":
      return "APPROVED";
    case "VOIDED":
      return "FAILED";
    default:
      return "CREATED";
  }
}

async function setStatus(id: string, status: Order["status"], buyerEmail?: string | null, shipping?: Order["shipping"]): Promise<Order> {
  const [row] = await getDb()
    .update(orders)
    .set({ status, updatedAt: new Date(), ...(buyerEmail ? { buyerEmail } : {}), ...(shipping ? { shipping } : {}) })
    .where(eq(orders.id, id))
    .returning();
  return row;
}

/**
 * Sync our order with PayPal. If PayPal says APPROVED and we have not captured yet, capture.
 * Idempotent: an order that is already PAID is returned untouched and never captured twice.
 */
export async function syncOrder(orderId: string, opts: { capture?: boolean } = { capture: true }): Promise<Order | null> {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  if (order.status === "PAID" || !order.paypalOrderId) return order;

  try {
    let pp = await paypal.getOrder(order.paypalOrderId);
    if (pp.status === "APPROVED" && opts.capture !== false) {
      pp = await paypal.captureOrder(order.paypalOrderId);
    }
    const next = mapPayPalStatus(pp.status);
    if (next === order.status && !pp.payerEmail && !pp.shipping) return order;
    return await setStatus(order.id, next, pp.payerEmail, pp.shipping);
  } catch (e) {
    console.error("[orders] sync failed", e);
    if (e instanceof paypal.PayPalError && e.status === 422) return await setStatus(order.id, "FAILED");
    return order;
  }
}

/** The merchant ships the order herself; this only records that she did. */
export type ShipResult = { ok: true; order: Order } | { ok: false; reason: "not_found" | "not_paid" };

/** Records that the merchant shipped a PAID order. Idempotent: a second call keeps the first shipping date. */
export async function markShipped(orderId: string, storeId: string): Promise<ShipResult> {
  const db = getDb();
  const [row] = await db
    .update(orders)
    .set({ shippedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId), eq(orders.status, "PAID"), isNull(orders.shippedAt)))
    .returning();
  if (row) return { ok: true, order: row };
  const [current] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)));
  if (!current) return { ok: false, reason: "not_found" };
  if (current.status !== "PAID") return { ok: false, reason: "not_paid" };
  return { ok: true, order: current };
}
