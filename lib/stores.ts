import { and, eq } from "drizzle-orm";
import { getDb, stores, products, variants, type Store } from "@/lib/db";
import { slugify } from "@/lib/slug";

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const [s] = await getDb().select().from(stores).where(eq(stores.slug, slug));
  return s ?? null;
}

export async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  const root = slugify(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, candidate));
    if (!hit) return candidate;
  }
  return `${root}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getCatalog(storeId: string) {
  const db = getDb();
  const prods = await db.select().from(products).where(eq(products.storeId, storeId)).orderBy(products.createdAt, products.name);
  if (!prods.length) return [];
  const vars = await db
    .select({ v: variants })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(eq(products.storeId, storeId)));
  return prods.map((p) => ({ ...p, variants: vars.filter((x) => x.v.productId === p.id).map((x) => x.v) }));
}

export type CatalogProduct = Awaited<ReturnType<typeof getCatalog>>[number];
