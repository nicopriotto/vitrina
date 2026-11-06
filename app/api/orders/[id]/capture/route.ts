import { NextResponse } from "next/server";
import { z } from "zod";
import { syncOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  const order = await syncOrder(id, { capture: true });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order_id: order.id, status: order.status, total: order.total, paid: order.status === "PAID" });
}
