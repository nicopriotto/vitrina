import { and, eq, gt, asc, sql } from "drizzle-orm";
import { getDb, ingestionEvents, products, stores } from "@/lib/db";
import { getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SSE stream of ingestion progress. Closes when the store is ready or failed. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Not found", { status: 404 });

  const db = getDb();
  const enc = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      let lastId = 0;
      let lastCount = -1;
      for (let tick = 0; tick < 400 && !closed; tick++) {
        const events = await db
          .select()
          .from(ingestionEvents)
          .where(and(eq(ingestionEvents.storeId, store.id), gt(ingestionEvents.id, lastId)))
          .orderBy(asc(ingestionEvents.id));
        for (const e of events) {
          lastId = e.id;
          send("progress", { id: e.id, step: e.step, message: e.message, progress: e.progress });
        }
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(eq(products.storeId, store.id));
        if (count !== lastCount) {
          lastCount = count;
          send("products", { count });
        }
        const [fresh] = await db.select().from(stores).where(eq(stores.id, store.id));
        if (fresh && fresh.status !== "ingesting") {
          send("status", { status: fresh.status, error: fresh.errorMessage });
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!closed) controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
