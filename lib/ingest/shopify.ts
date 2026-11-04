import * as cheerio from "cheerio";
import { fetchText, absoluteUrl } from "./http";
import { variantLabel, type ExtractedProduct } from "./types";

type ShopifyProduct = {
  title: string;
  handle: string;
  body_html?: string;
  options?: { name: string; position: number }[];
  images?: { src: string }[];
  variants?: { title: string; price: string; available?: boolean; option1?: string; option2?: string; option3?: string }[];
};

export function mapShopifyProducts(json: { products?: ShopifyProduct[] }, origin: string, currency = "USD"): ExtractedProduct[] {
  return (json.products ?? []).map((p) => {
    const optionNames = (p.options ?? []).map((o) => o.name.toLowerCase());
    const variants = (p.variants ?? []).map((v) => {
      const opts = [v.option1, v.option2, v.option3];
      let color: string | null = null;
      let size: string | null = null;
      optionNames.forEach((name, i) => {
        const val = opts[i];
        if (!val || val === "Default Title") return;
        if (/colou?r/.test(name)) color = val;
        else if (/size|talle/.test(name)) size = val;
      });
      return { color, size, price: Number(v.price), in_stock: v.available ?? true };
    });
    const prices = variants.map((v) => v.price ?? 0).filter((n) => n > 0);
    return {
      name: p.title,
      description: cheerio.load(p.body_html ?? "").text().trim().slice(0, 1000),
      price: prices.length ? Math.min(...prices) : 0,
      currency,
      image_url: absoluteUrl(p.images?.[0]?.src, origin),
      variants: variants.length === 1 && variantLabel(variants[0]) === "Default" ? [] : variants,
      in_stock: variants.length ? variants.some((v) => v.in_stock) : true,
      external_url: `${origin}/products/${p.handle}`,
    };
  });
}

/** Returns products if `{origin}/products.json` is a valid Shopify catalog, else null. */
export async function tryShopify(origin: string): Promise<ExtractedProduct[] | null> {
  try {
    const text = await fetchText(`${origin}/products.json?limit=250`);
    const json = JSON.parse(text);
    if (!Array.isArray(json.products) || json.products.length === 0) return null;
    return mapShopifyProducts(json, origin);
  } catch {
    return null;
  }
}
