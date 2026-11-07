import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, stores } from "@/lib/db";
import { syncOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function CheckoutReturn({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: id } = await searchParams;
  const valid = z.string().uuid().safeParse(id);
  const order = valid.success ? await syncOrder(valid.data, { capture: true }) : null;
  const [store] = order ? await getDb().select().from(stores).where(eq(stores.id, order.storeId)) : [];
  const paid = order?.status === "PAID";

  return (
    <main className="mx-auto max-w-[480px] px-8 py-20">
      <div className={`flex items-center gap-2 font-mono text-[13px] ${paid ? "text-pos" : "text-fg3"}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {paid ? "PAID" : order ? order.status : "NOT FOUND"}
      </div>
      <h1 className="mt-4 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">
        {paid ? "Payment complete" : order ? "Payment not completed yet" : "Order not found"}
      </h1>
      <p className="mt-3 text-fg2">
        {paid
          ? "You can go back to your assistant."
          : order
            ? "We haven't received the approval yet. Go back to your assistant and open the payment link again."
            : "We couldn't find that order."}
      </p>
      {order && (
        <div className="mt-10 rounded-xl border border-hair bg-surface">
          <div className="flex justify-between border-b border-dashed border-hair px-5 py-3 font-mono text-[12px] text-fg3">
            <span>{store?.name}</span>
            <span>#{order.id.slice(0, 8)}</span>
          </div>
          <div className="space-y-2 px-5 py-4 text-[15px]">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span>{it.quantity} × {it.name}{it.variantLabel && <span className="text-fg3"> · {it.variantLabel}</span>}</span>
                <span className="tnum font-mono">${(Number(it.unitPrice) * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed border-hair px-5 py-4">
            <span className="text-[13px] text-fg3">Total</span>
            <span className="tnum font-mono text-[24px] font-medium">${order.total}</span>
          </div>
        </div>
      )}
    </main>
  );
}
