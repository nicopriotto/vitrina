"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type WireEvent = {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  ms: number;
  summary: string;
  channel: "playground" | "mcp";
  createdAt: string;
};

function argText(args: Record<string, unknown>) {
  return Object.entries(args)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${typeof v === "object" ? "…" : String(v)}`)
    .join(" ");
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

export function useWire(slug: string, intervalMs = 1500) {
  const [events, setEvents] = useState<WireEvent[] | null>(null);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/stores/${slug}/wire`, { cache: "no-store" });
        if (res.ok && alive) setEvents((await res.json()).events);
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
  return events;
}

/** The live feed of tool calls hitting the store, from Claude (mcp) or the Playground. */
export function WireLog({ slug, limit = 12, className = "", legend = false }: { slug: string; limit?: number; className?: string; legend?: boolean }) {
  const events = useWire(slug);
  return <WireLogView events={events} limit={limit} className={className} legend={legend} />;
}

const TOOLS: [string, string][] = [
  ["get_store_info", "name, currency, product count"],
  ["search_products", "text, size, color, max price"],
  ["get_product", "details and variants"],
  ["create_checkout", "PayPal order, server-side total"],
  ["get_order_status", "check and capture the payment"],
];

export function WireLogView({ events, limit = 12, className = "", legend = false }: { events: WireEvent[] | null; limit?: number; className?: string; legend?: boolean }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-hair bg-deep ${className}`}>
      <div className="flex h-10 items-center justify-between border-b border-hair px-4 text-xs text-fg3">
        <span className="font-mono">tools/call</span>
        <span className="flex items-center gap-2">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> live
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto font-mono text-[13px] leading-5">
        {events && events.length === 0 && <li className="px-4 py-6 text-fg3">Waiting for the first tool call…</li>}
        {!events && <li className="px-4 py-6 text-fg3">Connecting…</li>}
        <AnimatePresence initial={false}>
          {(events ?? []).slice(0, limit).map((e) => (
            <motion.li
              key={e.id}
              layout="position"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="border-b border-hair px-4 py-2.5 last:border-0"
            >
              <div className="flex items-baseline gap-3">
                <span className="tnum text-fg3">{time(e.createdAt)}</span>
                <span className={e.channel === "mcp" ? "text-accent" : "text-fg2"}>{e.channel}</span>
                <span className="text-fg">{e.tool}</span>
                <span className={`tnum ml-auto ${e.ok ? "text-fg3" : "text-neg"}`}>{e.ok ? `${e.ms}ms` : "error"}</span>
              </div>
              {argText(e.args) && <div className="mt-0.5 truncate pl-[4.5rem] text-fg3">{argText(e.args)}</div>}
              <div className="mt-0.5 truncate pl-[4.5rem] text-fg2">{e.summary}</div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {legend && (
        <div className="border-t border-hair bg-surface px-4 py-4">
          <div className="mb-3 font-sans text-[13px] text-fg3">Tools on this endpoint</div>
          <ul className="space-y-1.5 font-mono text-[13px]">
            {TOOLS.map(([n, d]) => (
              <li key={n} className="flex justify-between gap-4"><span className="text-fg">{n}</span><span className="truncate text-fg3">{d}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
