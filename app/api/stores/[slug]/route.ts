import { NextResponse } from "next/server";
import { getCatalog, getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { payeeEmail: _payee, ...publicStore } = store;
  void _payee;
  return NextResponse.json({ store: publicStore, products: await getCatalog(store.id) });
}
