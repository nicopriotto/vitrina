"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, Loader2 } from "lucide-react";
import { Assistant, type Block, type Msg } from "../Playground";
import { CopyButton } from "../CopyButton";
import { OrdersFeedView } from "../OrdersLive";
import { WireLogView } from "../WireLog";
import { StoreNav } from "../StoreNav";
import { DEMO_PRODUCTS, DEMO_SLUG, DEMO_STORE, MOCK_ORDER_ID, MOCK_SHIPPING, MOCK_TOTAL, resetDemo, searchResult, useDemoOrders, useDemoWire, wireEvent } from "@/lib/demo";

const ease = [0.22, 1, 0.36, 1] as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function DemoCheckoutCard({ data, onPaid }: { data: any; onPaid: (orderId: string) => void }) {
  const [status, setStatus] = useState<"idle" | "approving" | "paying" | "paid">("idle");

  const pay = useCallback(async () => {
    setStatus("paying");
    await sleep(1200);
    setStatus("paid");
    onPaid(data.order_id);
  }, [data.order_id, onPaid]);

  useEffect(() => {
    if (!new URLSearchParams(location.search).has("autopay")) return;
    const t = setTimeout(() => setStatus("approving"), 2500);
    const t2 = setTimeout(() => void pay(), 4200);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [pay]);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="my-3 max-w-[360px] rounded-xl border border-hair bg-surface">
        <div className="flex items-center justify-between border-b border-dashed border-hair px-5 py-3 font-mono text-[12px] text-fg3">
          <span>{data.store_name}</span>
          <span>#{String(data.order_id).slice(0, 8)}</span>
        </div>
        <ul className="space-y-2 px-5 py-4">
          {data.items.map((it: any, i: number) => (
            <li key={i} className="flex justify-between gap-4 text-[14px]">
              <span>{it.quantity} × {it.name}<span className="text-fg3"> · {it.variantLabel}</span></span>
              <span className="tnum font-mono">${(Number(it.unitPrice) * it.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-dashed border-hair px-5 py-4">
          <span className="text-[13px] text-fg3">Total</span>
          <span className="tnum font-mono text-[24px] font-medium">${data.total_usd}</span>
        </div>
        <div className="px-5 pb-5">
          {status === "paid" ? (
            <div className="flex h-11 items-center gap-2 font-mono text-[14px] text-pos"><Check className="h-4 w-4" strokeWidth={1.5} /> PAID</div>
          ) : (
            <button onClick={() => setStatus("approving")} disabled={status !== "idle"} className="h-11 w-full rounded-md bg-[#ffc439] text-[15px] font-semibold text-[#111] transition-[filter] hover:brightness-95 disabled:opacity-70">
              Pay with PayPal
            </button>
          )}
          <p className="mt-3 text-[12px] text-fg3">The agent can&apos;t pay. You approve.</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {(status === "approving" || status === "paying") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 grid place-items-center bg-black/60">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="w-[400px] rounded-2xl bg-white p-8 text-[#111]">
              <div className="flex items-center justify-between text-[13px] text-[#666]">
                <span className="font-semibold text-[#003087]">PayPal</span>
                <span>Sandbox</span>
              </div>
              <h2 className="mt-6 text-[22px] font-medium">Pay {data.store_name}</h2>
              <div className="tnum mt-1 font-mono text-[34px] font-medium">${data.total_usd} USD</div>
              <dl className="mt-6 space-y-3 border-t border-[#e5e5e5] pt-5 text-[14px]">
                <div className="flex justify-between"><dt className="text-[#666]">Paying from</dt><dd>buyer@personal.example.com</dd></div>
                <div className="flex justify-between"><dt className="text-[#666]">Funds go to</dt><dd>lumen-store@business…</dd></div>
              </dl>
              <button onClick={() => void pay()} disabled={status === "paying"} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0070ba] text-[16px] font-medium text-white transition-[filter] hover:brightness-110 disabled:opacity-80">
                {status === "paying" ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} /> : `Pay $${data.total_usd}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function DemoPlayground({ mcpUrl }: { mcpUrl: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [wire, setWire] = useDemoWire();
  const [orders, setOrders] = useDemoOrders();
  const bottom = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const orderIdRef = useRef("");
  const [run, setRun] = useState(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const pushWire = useCallback((tool: string, args: Record<string, unknown>, summary: string, ms: number) => setWire((p) => [wireEvent(tool, args, summary, ms), ...p].slice(0, 40)), [setWire]);

  const updateLast = (fn: (b: Block[]) => Block[]) =>
    setMsgs((cur) => {
      const copy = [...cur];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", blocks: fn(last.blocks) };
      return copy;
    });

  const streamText = async (text: string, alive: () => boolean) => {
    for (const w of text.split(" ")) {
      if (!alive()) return;
      updateLast((bl) => {
        const last = bl[bl.length - 1];
        return last?.kind === "text" ? [...bl.slice(0, -1), { kind: "text", text: last.text + w + " " }] : [...bl, { kind: "text", text: w + " " }];
      });
      await sleep(45);
    }
  };

  const typeAndSend = async (text: string, alive: () => boolean) => {
    for (let i = 1; i <= text.length; i++) {
      if (!alive()) return;
      setInput(text.slice(0, i));
      await sleep(34);
    }
    await sleep(450);
    setInput("");
    setMsgs((c) => [...c, { role: "user", text }]);
  };

  const onPaid = useCallback(
    async (orderId: string) => {
      setBusy(true);
      setMsgs((c) => [...c, { role: "assistant", blocks: [{ kind: "tool", id: "t-status", name: "get_order_status", args: { order_id: orderId } }] }]);
      await sleep(700);
      const ms = 94;
      pushWire("get_order_status", { order_id: orderId }, `Paid. Order ${orderId} is confirmed (total $${MOCK_TOTAL}).`, ms);
      setOrders((p) => [
        { id: orderId, paypalOrderId: "8XY12345AB678901C", status: "PAID", items: [{ name: "Classic Tee", variantLabel: "Black / M", quantity: 1, unitPrice: MOCK_TOTAL }], total: MOCK_TOTAL, channel: "playground", createdAt: new Date().toISOString(), shipping: MOCK_SHIPPING, shippedAt: null },
        ...p.filter((o) => o.id !== orderId),
      ]);
      updateLast((bl) => bl.map((b) => (b.kind === "tool" ? { ...b, result: { ok: true, data: { status: "PAID" }, text: "Paid" } } : b)));
      await streamText(`Paid. Order #${orderId.slice(0, 8)} confirmed.`, () => true);
      setBusy(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushWire, setOrders],
  );

  useEffect(() => {
    const id = ++runId.current;
    const alive = () => id === runId.current;
    (async () => {
      setMsgs([]);
      setInput("");
      setBusy(false);
      orderIdRef.current = MOCK_ORDER_ID;
      await sleep(1200);
      if (!alive()) return;
      await typeAndSend("I need a black t-shirt in size M, under $40", alive);
      if (!alive()) return;
      setBusy(true);
      await sleep(400);
      const searchArgs = { query: "t-shirt", color: "black", size: "M", max_price: 40 };
      setMsgs((c) => [...c, { role: "assistant", blocks: [{ kind: "tool", id: "t1", name: "search_products", args: searchArgs }] }]);
      await sleep(1100);
      if (!alive()) return;
      pushWire("search_products", searchArgs, "- Classic Tee — $32.30; - Breton Stripe Tee — $37.40", 42);
      updateLast((bl) => bl.map((b) => (b.kind === "tool" ? { ...b, result: { ok: true, data: { products: searchResult() }, text: "2 products" } } : b)));
      await sleep(600);
      await streamText("The Classic Tee in black is a match at $32.30. The Breton Stripe Tee is $37.40 but comes in navy stripe. Which one would you like?", alive);
      setBusy(false);
      await sleep(1800);
      if (!alive()) return;
      await typeAndSend("The Classic Tee please", alive);
      if (!alive()) return;
      setBusy(true);
      await sleep(400);
      const coArgs = { items: [{ product_id: "remera-classic", variant_id: "remera-classic:Black:M", quantity: 1 }] };
      setMsgs((c) => [...c, { role: "assistant", blocks: [{ kind: "tool", id: "t2", name: "create_checkout", args: coArgs }] }]);
      await sleep(1300);
      if (!alive()) return;
      pushWire("create_checkout", { items: 1 }, `Checkout created (order ${orderIdRef.current}). Total $${MOCK_TOTAL}, approve_url ready`, 468);
      const tee = DEMO_PRODUCTS[0];
      updateLast((bl) =>
        bl.map((b) =>
          b.kind === "tool"
            ? { ...b, result: { ok: true, text: "checkout", data: { order_id: orderIdRef.current, paypal_order_id: "8XY12345AB678901C", store_name: DEMO_STORE.name, total_usd: MOCK_TOTAL, items: [{ name: tee.name, variantLabel: "Black / M", quantity: 1, unitPrice: MOCK_TOTAL }] } } }
            : b,
        ),
      );
      await sleep(500);
      await streamText("Your order is ready. Review it and approve the payment with PayPal below.", alive);
      setBusy(false);
    })();
    // bumping the run counter cancels this run's pending steps (alive() turns false)
    const runs = runId;
    return () => {
      runs.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return (
    <>
    <StoreNav name={DEMO_STORE.name} slug={DEMO_STORE.slug} demo />
    <div className="mx-auto mt-6 grid h-[calc(100vh-160px)] max-w-[1600px] grid-cols-1 gap-8 px-10 pb-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col">
        <div className="flex h-10 items-center justify-between text-[13px] text-fg3">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fg2" /> Agent · shopping at {DEMO_STORE.name}</span>
          <span className="font-mono">Same tools as MCP</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-hair bg-surface">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <AnimatePresence initial={false}>
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="flex justify-end">
                    <div className="max-w-[80%] rounded-xl bg-raised px-4 py-3 text-[16px]">{m.text}</div>
                  </motion.div>
                ) : (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
                    <Assistant blocks={m.blocks} onPaid={onPaid} checkout={(data, paid) => <DemoCheckoutCard data={data} onPaid={paid} />} />
                  </motion.div>
                ),
              )}
            </AnimatePresence>
            {busy && <Loader2 className="h-4 w-4 animate-spin text-fg3" strokeWidth={1.5} />}
            <div ref={bottom} />
          </div>
          <div className="flex gap-2 border-t border-hair p-3">
            <input readOnly value={input} placeholder="Message" className="h-12 flex-1 rounded-lg border border-hair bg-bg px-4 text-[16px] outline-none placeholder:text-fg3" />
            <button disabled className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-[#1a0f0a] disabled:opacity-40" aria-label="Send">
              <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-[13px] text-fg3">
          <button onClick={() => { resetDemo(); setRun((r) => r + 1); }} className="transition-colors hover:text-fg">Reset and replay</button>
        </div>
      </section>

      <section className="hidden min-h-0 flex-col lg:flex">
        <div className="flex h-10 items-center justify-between text-[13px] text-fg3">
          <span className="flex items-center gap-2"><span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> Merchant · {DEMO_STORE.name}</span>
          <span className="flex items-center gap-2 font-mono"><span className="max-w-[240px] truncate">{mcpUrl}</span><CopyButton text={mcpUrl} /></span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <WireLogView events={wire} limit={12} className="min-h-0 flex-1" legend />
          <div className="shrink-0 rounded-xl border border-hair bg-surface">
            <div className="flex h-10 items-center border-b border-hair px-4 text-[13px] text-fg3">Orders</div>
            <OrdersFeedView orders={orders} limit={4} />
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

export { DEMO_SLUG };
