"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ApiOrder } from "./types";

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function useOrders(slug: string, intervalMs = 2000) {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/stores/${slug}/orders`, { cache: "no-store" });
        if (res.ok && alive) setOrders((await res.json()).orders);
      } catch {
        /* retry on next tick */
      }
    }
    void tick();
    const t = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [slug, intervalMs]);
  return orders;
}

const STATUS_COLOR: Record<ApiOrder["status"], string> = {
  PAID: "text-pos",
  CREATED: "text-fg3",
  APPROVED: "text-warn",
  FAILED: "text-neg",
};

export function StatusText({ status }: { status: ApiOrder["status"] }) {
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[13px] ${STATUS_COLOR[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function ChannelText({ channel }: { channel: ApiOrder["channel"] }) {
  return <span className={`font-mono text-[13px] ${channel === "mcp" ? "text-accent" : "text-fg2"}`}>{channel}</span>;
}

export function OrdersFeed({ slug, limit = 5 }: { slug: string; limit?: number }) {
  return <OrdersFeedView orders={useOrders(slug)} limit={limit} />;
}

export function OrdersFeedView({ orders, limit = 5 }: { orders: ApiOrder[] | null; limit?: number }) {
  if (!orders) return <p className="px-4 py-5 text-[13px] text-fg3">Loading…</p>;
  if (!orders.length) return <p className="px-4 py-5 text-[13px] text-fg3">No orders yet.</p>;
  return (
    <ul>
      <AnimatePresence initial={false}>
        {orders.slice(0, limit).map((o) => (
          <motion.li key={o.id} layout="position" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex items-center justify-between gap-3 border-b border-hair px-4 py-3 text-[14px] last:border-0">
            <span className="truncate">{o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</span>
            <span className="flex shrink-0 items-center gap-4"><span className="tnum font-mono">${o.total}</span><StatusText status={o.status} /></span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function OrdersTable({ slug }: { slug: string }) {
  const orders = useOrders(slug);
  const [shipped, setShipped] = useState<Record<string, string>>({});
  const view = orders?.map((o) => (shipped[o.id] && !o.shippedAt ? { ...o, shippedAt: shipped[o.id] } : o)) ?? null;
  async function ship(id: string) {
    setShipped((s) => ({ ...s, [id]: new Date().toISOString() }));
    await fetch(`/api/stores/${slug}/orders/${id}/ship`, { method: "POST" }).catch(() => {});
  }
  return <OrdersTableView orders={view} playgroundHref={`/stores/${slug}/playground`} onShip={ship} />;
}

/** Ship-to from the buyer's PayPal account, and the one thing the merchant does by hand: ship it. */
function ShipCell({ o, onShip }: { o: ApiOrder; onShip?: (id: string) => void }) {
  if (o.status !== "PAID") return <span className="text-[14px] text-fg3">—</span>;
  const a = o.shipping;
  return (
    <div className="flex flex-col gap-2">
      {a ? (
        <div className="text-[14px] leading-snug">
          <div>{a.name}</div>
          <div className="text-fg3">{a.line1}, {a.city}{a.state ? ` ${a.state}` : ""} {a.postalCode}</div>
        </div>
      ) : (
        <span className="text-[14px] text-fg3">In your PayPal account</span>
      )}
      {o.shippedAt ? (
        <span className="font-mono text-[13px] text-pos">Shipped</span>
      ) : onShip ? (
        <button onClick={() => onShip(o.id)} className="h-8 self-start rounded-lg bg-raised px-3 text-[13px] transition-colors hover:bg-hair">Mark as shipped</button>
      ) : null}
    </div>
  );
}

export function OrdersTableView({ orders, playgroundHref, onShip }: { orders: ApiOrder[] | null; playgroundHref: string; onShip?: (id: string) => void }) {
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const fresh = new Set<string>();
  if (orders) {
    for (const o of orders) if (!seen.current.has(o.id) && !first.current) fresh.add(o.id);
    orders.forEach((o) => seen.current.add(o.id));
    first.current = false;
  }
  const paid = (orders ?? []).filter((o) => o.status === "PAID");
  const sold = paid.reduce((a, o) => a + Number(o.total), 0);

  return (
    <div>
      <dl className="grid grid-cols-3 divide-x divide-hair border-y border-hair">
        <Stat label="Total sold" value={`$${sold.toFixed(2)}`} />
        <Stat label="Paid orders" value={String(paid.length)} />
        <Stat label="All orders" value={String(orders?.length ?? 0)} />
      </dl>
      <table className="mt-8 w-full text-left text-[15px]">
        <thead className="text-[13px] text-fg3">
          <tr className="border-b border-hair">
            <th className="py-3 pr-4 font-normal">Order</th>
            <th className="py-3 pr-4 font-normal">When</th>
            <th className="py-3 pr-4 font-normal">Items</th>
            <th className="py-3 pr-4 font-normal">Ship to</th>
            <th className="py-3 pr-4 font-normal">Channel</th>
            <th className="py-3 pr-4 font-normal">Status</th>
            <th className="py-3 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {(orders ?? []).map((o) => (
              <motion.tr
                key={o.id}
                layout="position"
                initial={fresh.has(o.id) ? { opacity: 0, backgroundColor: "rgba(255,122,69,0.16)" } : false}
                animate={{ opacity: 1, backgroundColor: "rgba(255,122,69,0)" }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-hair align-top"
              >
                <td className="py-4 pr-4 font-mono text-[13px] text-fg2">#{o.id.slice(0, 8)}</td>
                <td className="py-4 pr-4 text-[14px] text-fg3">{ago(o.createdAt)}</td>
                <td className="py-4 pr-4">
                  {o.items.map((it, i) => (
                    <div key={i}>{it.quantity} × {it.name}{it.variantLabel && <span className="text-fg3"> · {it.variantLabel}</span>}</div>
                  ))}
                </td>
                <td className="py-4 pr-4"><ShipCell o={o} onShip={onShip} /></td>
                <td className="py-4 pr-4"><ChannelText channel={o.channel} /></td>
                <td className="py-4 pr-4"><StatusText status={o.status} /></td>
                <td className="tnum py-4 text-right font-mono">${o.total}</td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {orders && orders.length === 0 && (
            <tr>
              <td colSpan={7} className="py-20 text-center">
                <div className="text-[17px] text-fg2">No orders yet</div>
                <p className="mt-1 text-[14px] text-fg3">Orders appear here the moment an agent checks out and the buyer pays.</p>
                <a href={playgroundHref} className="mt-5 inline-flex h-10 items-center rounded-lg bg-raised px-4 text-[14px] transition-colors hover:bg-hair">Open the agent playground</a>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-6 first:pl-0">
      <dt className="text-[13px] text-fg3">{label}</dt>
      <dd className="tnum mt-2 font-mono text-[40px] font-medium leading-none tracking-tight">{value}</dd>
    </div>
  );
}
