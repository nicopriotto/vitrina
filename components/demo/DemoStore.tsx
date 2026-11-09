"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { Connect } from "../StoreView";
import { ProductCard } from "../ProductCard";
import { WireLogView } from "../WireLog";
import { StoreNav } from "../StoreNav";
import { DEMO_PRODUCTS, DEMO_STORE, INGEST_STEPS, useDemoWire } from "@/lib/demo";

const ease = [0.22, 1, 0.36, 1] as const;

export function DemoStore({ mcpUrl }: { mcpUrl: string }) {
  const [steps, setSteps] = useState<{ id: number; message: string }[]>([]);
  const [progress, setProgress] = useState(3);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [wire] = useDemoWire();

  useEffect(() => {
    let cancelled = false;
    const skip = new URLSearchParams(location.search).has("done");
    (async () => {
      if (skip) {
        setCount(DEMO_PRODUCTS.length);
        setReady(true);
        return;
      }
      for (let i = 0; i < INGEST_STEPS.length && !cancelled; i++) {
        const s = INGEST_STEPS[i];
        setSteps((p) => [...p, { id: i, message: s.message }]);
        setProgress(s.progress);
        if (s.products) setCount(s.products);
        await new Promise((r) => setTimeout(r, s.wait));
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto max-w-[1600px] px-10 pb-24 pt-8">
        <div className="font-mono text-[13px] text-fg3">{DEMO_STORE.host}</div>
        <h1 className="mt-2 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">Making this store agent-ready</h1>
        <div className="mt-8 h-px w-full bg-hair">
          <motion.div className="h-px bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease }} />
        </div>
        <div className="mt-10 grid gap-16 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ul className="space-y-4 font-mono text-[14px]">
            <AnimatePresence initial={false}>
              {steps.slice(-9).map((s, i, arr) => {
                const last = i === arr.length - 1;
                return (
                  <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="flex items-center gap-3">
                    {last ? <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={1.5} /> : <Check className="h-4 w-4 text-pos" strokeWidth={1.5} />}
                    <span className={last ? "text-fg" : "text-fg3"}>{s.message}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {DEMO_PRODUCTS.slice(0, count).map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
                  <ProductCard p={p} compact />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <StoreNav name={DEMO_STORE.name} slug={DEMO_STORE.slug} demo />
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="mx-auto max-w-[1600px] px-10 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-fg3">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> Endpoint live · <span className="font-mono">{DEMO_STORE.host}</span>
          </div>
          <h1 className="mt-3 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">{DEMO_STORE.name}</h1>
          <p className="mt-2 max-w-xl text-fg2">{DEMO_STORE.description}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/demo/orders" className="inline-flex h-11 items-center rounded-lg border border-hair bg-raised px-5 text-[15px] transition-colors hover:border-fg3">Orders</Link>
          <Link href="/demo/playground" className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-[#1a0f0a] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]">
            Try it with an agent <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Connect slug={DEMO_STORE.slug} mcpUrl={mcpUrl} />
        <WireLogView events={wire} limit={6} />
      </div>

      <div className="mb-5 mt-14 flex items-baseline justify-between">
        <h2 className="text-[17px] font-medium">Catalog</h2>
        <span className="tnum font-mono text-[13px] text-fg3">{DEMO_PRODUCTS.length} products</span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 xl:grid-cols-6">
        {DEMO_PRODUCTS.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease }}>
            <ProductCard p={p} />
          </motion.div>
        ))}
      </div>
    </motion.div>
    </>
  );
}
