import { eq } from "drizzle-orm";
import { getDb, stores, products, variants, ingestionEvents } from "@/lib/db";
import { llmConfigured } from "@/lib/llm";
import { fetchText, mapLimit } from "./http";
import { tryShopify } from "./shopify";
import { discoverProductLinks, parseJsonLdProducts } from "./jsonld";
import {
  basicStoreInfo,
  describeStore,
  extractProductFromPage,
  extractProductsFromListing,
} from "./llm-extract";
import { toUsd } from "./currency";
import { variantLabel, type ExtractedProduct } from "./types";

const MAX_PRODUCTS = 40;

export class IngestionError extends Error {}

async function emit(storeId: string, step: string, message: string, progress: number) {
  await getDb().insert(ingestionEvents).values({ storeId, step, message, progress });
}

async function saveProduct(storeId: string, p: ExtractedProduct): Promise<boolean> {
  const db = getDb();
  const usd = toUsd(p.price, p.currency);
  if (usd === null) return false;
  const isUsd = p.currency.toUpperCase() === "USD";
  const [row] = await db
    .insert(products)
    .values({
      storeId,
      externalUrl: p.external_url ?? null,
      name: p.name.slice(0, 200),
      description: p.description,
      imageUrl: p.image_url ?? null,
      price: usd.toFixed(2),
      originalPrice: isUsd ? null : String(p.price),
      originalCurrency: isUsd ? null : p.currency.toUpperCase(),
      inStock: p.variants.length ? p.variants.some((v) => v.in_stock) : p.in_stock,
    })
    .returning({ id: products.id });

  if (p.variants.length) {
    await db.insert(variants).values(
      p.variants.map((v) => {
        const vUsd = v.price != null ? toUsd(v.price, p.currency) : null;
        return {
          productId: row.id,
          label: variantLabel(v),
          attributes: {
            ...(v.color ? { color: v.color } : {}),
            ...(v.size ? { size: v.size } : {}),
          },
          priceOverride: vUsd !== null && vUsd !== usd ? vUsd.toFixed(2) : null,
          inStock: v.in_stock,
        };
      }),
    );
  }
  return true;
}

async function fail(storeId: string, message: string) {
  const db = getDb();
  await db.update(stores).set({ status: "failed", errorMessage: message }).where(eq(stores.id, storeId));
  await emit(storeId, "failed", message, 100);
}

const NO_PRODUCTS_MSG = "We couldn't find products on this site. Try the demo store.";

export async function runIngestion(storeId: string): Promise<void> {
  const db = getDb();
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId));
    if (!store) return;
    const url = store.sourceUrl;
    const origin = new URL(url).origin;

    await emit(storeId, "fetching", "Fetching site…", 5);
    let homeHtml: string;
    try {
      homeHtml = await fetchText(url);
    } catch {
      return fail(storeId, "We couldn't reach that site. Check the URL or try the demo store.");
    }

    await emit(storeId, "finding", "Finding products…", 15);
    let extracted: ExtractedProduct[] = [];
    let method = "";

    // 1. Shopify
    const shopify = await tryShopify(origin);
    if (shopify?.length) {
      extracted = shopify.slice(0, MAX_PRODUCTS);
      method = "Shopify catalog";
    }

    // 2. JSON-LD
    let pages: { url: string; html: string }[] = [];
    if (!extracted.length) {
      const links = discoverProductLinks(homeHtml, url, MAX_PRODUCTS);
      await emit(storeId, "finding", `Found ${links.length} product page${links.length === 1 ? "" : "s"}`, 25);
      let fetched = 0;
      const results = await mapLimit(links, 5, async (link) => {
        try {
          const html = await fetchText(link);
          fetched++;
          await emit(storeId, "reading", `Reading product ${fetched} of ${links.length}`, 25 + Math.round((fetched / Math.max(links.length, 1)) * 30));
          return { url: link, html };
        } catch {
          fetched++;
          return null;
        }
      });
      pages = results.filter((r): r is { url: string; html: string } => r !== null);
      const ld = pages.flatMap((pg) => parseJsonLdProducts(pg.html, pg.url));
      if (ld.length) {
        extracted = ld.slice(0, MAX_PRODUCTS);
        method = "structured data (JSON-LD)";
      }
    }

    // 3. LLM extraction
    if (!extracted.length) {
      if (!llmConfigured()) {
        return fail(
          storeId,
          "This site has no structured product data, and this deployment runs without an AI key. Add your own AI key on the home page, or try the demo store with structured data (/mock/lumen?jsonld=1).",
        );
      }
      method = "AI extraction";
      await emit(storeId, "reading", "No structured data found, reading pages with AI…", 30);
      if (pages.length) {
        let done = 0;
        const results = await mapLimit(pages, 4, async (pg) => {
          try {
            const p = await extractProductFromPage(pg.html, pg.url);
            done++;
            await emit(storeId, "reading", `Reading product ${done} of ${pages.length}`, 30 + Math.round((done / pages.length) * 50));
            return p;
          } catch (e) {
            done++;
            console.warn("[ingest] LLM extraction failed for", pg.url, e);
            return null;
          }
        });
        extracted = results.filter((r): r is ExtractedProduct => r !== null);
      } else {
        extracted = await extractProductsFromListing(homeHtml, url);
      }
    }

    if (!extracted.length) return fail(storeId, NO_PRODUCTS_MSG);

    await emit(storeId, "building", `Building catalog from ${method}…`, 85);
    let saved = 0;
    for (const p of extracted) {
      if (await saveProduct(storeId, p)) saved++;
    }
    if (!saved) return fail(storeId, NO_PRODUCTS_MSG);

    // Store name + description
    let info = basicStoreInfo(homeHtml, url);
    if (llmConfigured()) {
      try {
        info = await describeStore(homeHtml, url);
      } catch (e) {
        console.warn("[ingest] describeStore failed, using fallback", e);
      }
    }

    await emit(storeId, "publishing", "Publishing agent endpoint…", 95);
    await db
      .update(stores)
      .set({ status: "ready", name: info.name.slice(0, 80), description: info.description })
      .where(eq(stores.id, storeId));
    await emit(storeId, "ready", `Ready: ${saved} products live`, 100);
  } catch (e) {
    console.error("[ingest] failed", e);
    await fail(storeId, "Something went wrong while reading this site. Try the demo store.").catch(() => {});
  }
}
