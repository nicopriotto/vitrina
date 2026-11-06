import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, orders } from "@/lib/db";
import { syncOrder } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/paypal";

export const runtime = "nodejs";

/** Nice-to-have: the demo flow never depends on webhooks (they cannot reach localhost). */
export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  if (!event?.event_type) return NextResponse.json({ error: "bad payload" }, { status: 400 });
  if (!(await verifyWebhookSignature(req.headers, event).catch(() => false))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const resource = event.resource ?? {};
  let paypalOrderId: string | undefined;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED") paypalOrderId = resource.id;
  else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") paypalOrderId = resource.supplementary_data?.related_ids?.order_id;

  if (paypalOrderId) {
    const [order] = await getDb().select().from(orders).where(eq(orders.paypalOrderId, paypalOrderId));
    if (order) await syncOrder(order.id, { capture: event.event_type === "CHECKOUT.ORDER.APPROVED" });
  }
  return NextResponse.json({ ok: true });
}
