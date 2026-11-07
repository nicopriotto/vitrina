import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, toolEvents } from "@/lib/db";
import { getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Latest tool calls made against this store (from the MCP endpoint or the Playground). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await getDb().select().from(toolEvents).where(eq(toolEvents.storeId, store.id)).orderBy(desc(toolEvents.id)).limit(40);
  return NextResponse.json({ events: rows });
}
