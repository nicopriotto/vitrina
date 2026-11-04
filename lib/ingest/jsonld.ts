import * as cheerio from "cheerio";
import { absoluteUrl } from "./http";
import type { ExtractedProduct } from "./types";

type Json = Record<string, any>;

const SIZE_RE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,3}(\.\d)?|one size|os|u)$/i;

function flatten(node: unknown, out: Json[] = []): Json[] {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (node && typeof node === "object") {
    out.push(node as Json);
    const g = (node as Json)["@graph"];
    if (g) flatten(g, out);
  }
  return out;
}

function isType(node: Json, type: string) {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
  }
  return null;
}

function inStock(avail: unknown): boolean {
  return !/OutOfStock|SoldOut|Discontinued/i.test(String(avail ?? ""));
}

function splitLabel(label: string): { color: string | null; size: string | null } {
  const parts = label.split(/\s*[/|,-]\s*/).filter(Boolean);
  let color: string | null = null;
  let size: string | null = null;
  for (const part of parts) {
    if (SIZE_RE.test(part)) size = part;
    else color = color ? `${color} ${part}` : part;
  }
  return { color, size };
}

function offersOf(product: Json): Json[] {
  const o = product.offers;
  if (!o) return [];
  const list = Array.isArray(o) ? o : [o];
  return list.flatMap((x: Json) => (Array.isArray(x.offers) ? x.offers : [x]));
}

function imageOf(product: Json, pageUrl: string): string | null {
  let img = product.image;
  if (Array.isArray(img)) img = img[0];
  if (img && typeof img === "object") img = img.url ?? img.contentUrl;
  return absoluteUrl(typeof img === "string" ? img : null, pageUrl);
}

function mapProduct(p: Json, pageUrl: string): ExtractedProduct | null {
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return null;

  // ProductGroup with hasVariant -> variants from child Products
  const children: Json[] = Array.isArray(p.hasVariant) ? p.hasVariant : [];
  const offers: Json[] = children.length ? children.flatMap((c) => offersOf(c).map((o) => ({ ...o, __child: c }))) : offersOf(p);
  if (!offers.length) return null;

  const currency = String(offers.find((o) => o.priceCurrency)?.priceCurrency ?? offers[0]?.priceCurrency ?? "USD").toUpperCase();
  const prices = offers
    .map((o) => num(o.price ?? o.lowPrice ?? o.priceSpecification?.price))
    .filter((n): n is number => n !== null);
  if (!prices.length) return null;

  const variants = offers.length > 1 || children.length
    ? offers.map((o) => {
        const child: Json | undefined = o.__child;
        const label = String(child?.name ?? o.name ?? "");
        const split = splitLabel(label);
        const color = (child?.color as string | undefined) ?? split.color;
        const size = (child?.size as string | undefined) ?? split.size;
        const price = num(o.price ?? o.lowPrice);
        return { color: color ?? null, size: size ?? null, price, in_stock: inStock(o.availability) };
      })
    : [];

  return {
    name,
    description: String(p.description ?? "").replace(/\s+/g, " ").trim().slice(0, 1000),
    price: Math.min(...prices),
    currency,
    image_url: imageOf(p, pageUrl),
    variants,
    in_stock: offers.some((o) => inStock(o.availability)),
    external_url: absoluteUrl(typeof p.url === "string" ? p.url : null, pageUrl) ?? pageUrl,
  };
}

/** Parse every schema.org Product found in the page's ld+json blocks. */
export function parseJsonLdProducts(html: string, pageUrl: string): ExtractedProduct[] {
  const $ = cheerio.load(html);
  const found: ExtractedProduct[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      for (const node of flatten(JSON.parse(raw))) {
        if (isType(node, "Product") || isType(node, "ProductGroup")) {
          const mapped = mapProduct(node, pageUrl);
          if (mapped) found.push(mapped);
        }
      }
    } catch {
      /* ignore malformed block */
    }
  });
  return found;
}

const PRODUCT_PATH_RE = /\/(products?|productos?|p|item|items|shop\/[^/]+)\/[^/?#]+/i;

/** Collect internal links that look like product pages. */
export function discoverProductLinks(html: string, baseUrl: string, max = 40): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const byPath: string[] = [];
  const byCard: string[] = [];

  $("a[href]").each((_, el) => {
    const abs = absoluteUrl($(el).attr("href"), baseUrl);
    if (!abs) return;
    const u = new URL(abs);
    if (u.origin !== base.origin) return;
    u.hash = "";
    const key = u.origin + u.pathname;
    if (u.pathname === base.pathname || u.pathname === "/" || seen.has(key)) return;
    if (PRODUCT_PATH_RE.test(u.pathname)) {
      seen.add(key);
      byPath.push(u.origin + u.pathname + u.search);
    } else if ($(el).find("img").length && $(el).text().trim().length > 0) {
      seen.add(key);
      byCard.push(u.origin + u.pathname + u.search);
    }
  });

  return (byPath.length ? byPath : byCard).slice(0, max);
}
