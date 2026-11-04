import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { extractStructured } from "@/lib/llm";
import { absoluteUrl } from "./http";
import {
  extractedProductSchema,
  productListSchema,
  storeInfoSchema,
  type ExtractedProduct,
} from "./types";

const MAX_CHARS = 15_000;
const turndown = new TurndownService({ headingStyle: "atx" });

/** Strip script/style/nav/footer, convert to markdown and cut to ~15k chars. */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, svg, iframe, header nav").remove();
  // keep inline siblings (swatches, size chips) from running together in the markdown
  $("span, button, a, li").each((_, el) => {
    $(el).after(" ");
  });
  const body = $("main").length ? $("main").html() : $("body").html();
  return turndown.turndown(body ?? "").replace(/\n{3,}/g, "\n\n").slice(0, MAX_CHARS);
}

function firstImage(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);
  const og = $('meta[property="og:image"]').attr("content");
  const img = og ?? $("main img, img").first().attr("src");
  return absoluteUrl(img, pageUrl);
}

const PRODUCT_SYSTEM = `You extract structured product data from the markdown of an online store page.
Rules: use only information present on the page; never invent products, prices or variants.
"price" is a plain number in the page's currency (no symbols; "ARS 38.000" -> 38000; "$1.299,50" -> 1299.5).
"currency" is the ISO 4217 code (infer from symbols/text; ARS for "ARS"/"$" on Argentine stores).
"variants" lists one entry per sellable color/size combination; mark in_stock=false for sold out ones. Use [] if there are no options.`;

export async function extractProductFromPage(html: string, pageUrl: string): Promise<ExtractedProduct> {
  const md = htmlToMarkdown(html);
  const result = await extractStructured({
    schema: extractedProductSchema,
    name: "product",
    system: PRODUCT_SYSTEM,
    user: `Page URL: ${pageUrl}\n\n${md}`,
  });
  return {
    ...result,
    image_url: absoluteUrl(result.image_url, pageUrl) ?? firstImage(html, pageUrl),
    external_url: pageUrl,
  };
}

export async function extractProductsFromListing(html: string, pageUrl: string): Promise<ExtractedProduct[]> {
  const md = htmlToMarkdown(html);
  const result = await extractStructured({
    schema: productListSchema,
    name: "product_list",
    system: PRODUCT_SYSTEM + "\nReturn every product shown on the page (max 40).",
    user: `Page URL: ${pageUrl}\n\n${md}`,
  });
  return result.products.slice(0, 40).map((p) => ({ ...p, image_url: absoluteUrl(p.image_url, pageUrl), external_url: pageUrl }));
}

export async function describeStore(homeHtml: string, url: string) {
  const md = htmlToMarkdown(homeHtml).slice(0, 6000);
  return extractStructured({
    schema: storeInfoSchema,
    name: "store_info",
    system:
      "From the home page of an online store, return the brand name (short, no tagline) and a one-sentence description (max 140 chars) of what it sells.",
    user: `URL: ${url}\n\n${md}`,
  });
}

/** Non-AI fallback for store name/description. */
export function basicStoreInfo(homeHtml: string, url: string) {
  const $ = cheerio.load(homeHtml);
  const title = $("title").first().text().trim();
  const name = (title.split(/\s[—–|·-]\s/)[0] || new URL(url).hostname).slice(0, 60);
  const description = ($('meta[name="description"]').attr("content") ?? "").trim().slice(0, 200);
  return { name, description };
}
