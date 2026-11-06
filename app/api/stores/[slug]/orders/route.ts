import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, orders } from "@/lib/db";
import { getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await getDb().select().from(orders).where(eq(orders.storeId, store.id)).orderBy(desc(orders.createdAt)).limit(100);
  return NextResponse.json({ orders: rows });
}
