import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { getDb, stores } from "@/lib/db";
import { runIngestion } from "@/lib/ingest";
import { fetchText } from "@/lib/ingest/http";
import { uniqueSlug } from "@/lib/stores";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url(),
  payeeEmail: z.string().email(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid store URL and PayPal email." }, { status: 400 });
  }
  const { url, payeeEmail } = parsed.data;
  if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: "URL must start with http(s)://" }, { status: 400 });

  // Derive a readable slug from the page title (falls back to the hostname).
  let baseName = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  try {
    const html = await fetchText(url, 5000);
    const title = cheerio.load(html)("title").first().text().trim().split(/\s[—–|·-]\s/)[0];
    if (title) baseName = title;
  } catch {
    /* ingestion will report unreachable sites */
  }

  const slug = await uniqueSlug(baseName);
  const [store] = await getDb()
    .insert(stores)
    .values({ slug, name: baseName.slice(0, 80), sourceUrl: url, payeeEmail, status: "ingesting" })
    .returning();

  // Fire and forget: progress is published through ingestion_events.
  void runIngestion(store.id);
  return NextResponse.json({ slug });
}
