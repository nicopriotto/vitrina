import { NextResponse } from "next/server";
import { markShipped } from "@/lib/orders";
import { getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The merchant ships the parcel herself; this records it. Only PAID orders can be marked. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await markShipped(id, store.id);
  if (!result.ok && result.reason === "not_found") return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!result.ok) return NextResponse.json({ error: "Only paid orders can be marked as shipped" }, { status: 409 });
  return NextResponse.json({ order: result.order });
}
