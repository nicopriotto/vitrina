"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ArrowUp, Check, ChevronDown, Loader2 } from "lucide-react";
import { AiKeyControl } from "@/components/AiKeyControl";
import { aiKeyHeaders, PROVIDER_LABELS, useAiKey } from "@/lib/ai-key-client";
import { CopyButton } from "./CopyButton";
import { OrdersFeed } from "./OrdersLive";
import { WireLog } from "./WireLog";

export type ToolBlock = { kind: "tool"; id: string; name: string; args: any; result?: { ok: boolean; data: any; text: string } };
export type TextBlock = { kind: "text"; text: string };
export type Block = TextBlock | ToolBlock;
export type Msg = { role: "user"; text: string; hidden?: boolean } | { role: "assistant"; blocks: Block[] };

/** The model needs tool results (ids!) from earlier turns, so fold them into the assistant history. */
function historyFor(msgs: Msg[]) {
  return msgs.map((m) =>
    m.role === "user"
      ? { role: "user" as const, content: m.text }
      : {
          role: "assistant" as const,
          content:
            m.blocks
              .map((b) => (b.kind === "text" ? b.text : b.result ? `[tool ${b.name} result] ${b.result.text}` : ""))
              .filter(Boolean)
              .join("\n") || "(no reply)",
        },
  );
}

function argSummary(args: any) {
  const entries = Object.entries(args ?? {}).filter(([, v]) => v !== undefined && v !== "" && typeof v !== "object");
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
}

export function ToolChip({ b }: { b: ToolBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 border-l border-hair pl-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-mono text-[13px] text-fg3 transition-colors hover:text-fg">
        {b.result ? <span className={`h-1.5 w-1.5 rounded-full ${b.result.ok ? "bg-pos" : "bg-neg"}`} /> : <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
        <span className="text-fg">{b.name}</span>
        {argSummary(b.args) && <span>{argSummary(b.args)}</span>}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-deep p-3 font-mono text-xs leading-relaxed text-fg2">
          {JSON.stringify({ arguments: b.args, result: b.result?.data ?? b.result?.text }, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function ProductResults({ products }: { products: any[] }) {
  return (
    <div className="my-3 flex gap-4 overflow-x-auto pb-1">
      {products.map((p) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-40 shrink-0">
          <div className="aspect-square overflow-hidden rounded-xl bg-[#f3f0e8]">{p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-contain p-[7%]" />}</div>
          <div className="mt-2 flex items-baseline justify-between gap-2 text-[14px]">
            <span className="truncate font-medium">{p.name}</span>
            <span className="tnum font-mono">${Number(p.price_usd).toFixed(2)}</span>
          </div>
          <div className="mt-0.5 truncate text-[12px] text-fg3">{p.variants.slice(0, 4).map((v: any) => v.label).join(" · ")}</div>
        </motion.div>
      ))}
    </div>
  );
}

function CheckoutCard({ data, onPaid }: { data: any; onPaid: (orderId: string) => void }) {
  const [status, setStatus] = useState<"idle" | "paying" | "paid" | "error">("idle");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="my-3 max-w-[360px] rounded-xl border border-hair bg-surface">
      <div className="flex items-center justify-between border-b border-dashed border-hair px-5 py-3 font-mono text-[12px] text-fg3">
        <span>{data.store_name}</span>
        <span>#{String(data.order_id).slice(0, 8)}</span>
      </div>
      <ul className="space-y-2 px-5 py-4">
        {data.items.map((it: any, i: number) => (
          <li key={i} className="flex justify-between gap-4 text-[14px]">
            <span>{it.quantity} × {it.name}{it.variantLabel && <span className="text-fg3"> · {it.variantLabel}</span>}</span>
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
          <PayPalButtons
            fundingSource="paypal"
            style={{ layout: "vertical", shape: "rect", label: "pay", height: 44 }}
            disabled={status === "paying"}
            createOrder={async () => data.paypal_order_id}
            onApprove={async () => {
              setStatus("paying");
              try {
                const res = await fetch(`/api/orders/${data.order_id}/capture`, { method: "POST" });
                const body = await res.json();
                if (body.paid) {
                  setStatus("paid");
                  onPaid(data.order_id);
                } else setStatus("error");
              } catch {
                setStatus("error");
              }
            }}
            onError={() => setStatus("error")}
          />
        )}
        {status === "error" && <p className="mt-2 text-[13px] text-neg">Payment didn&apos;t complete. Try again.</p>}
        <p className="mt-3 text-[12px] text-fg3">The agent can&apos;t pay. You approve.</p>
      </div>
    </motion.div>
  );
}

export function Assistant({ blocks, onPaid, checkout }: { blocks: Block[]; onPaid: (orderId: string) => void; checkout?: (data: any, onPaid: (orderId: string) => void) => React.ReactNode }) {
  return (
    <div className="max-w-[640px]">
      {blocks.map((b, i) => {
        if (b.kind === "text") return b.text.trim() ? <p key={i} className="whitespace-pre-wrap text-[16px] leading-[1.6]">{b.text.trim()}</p> : null;
        return (
          <div key={b.id}>
            <ToolChip b={b} />
            {b.result?.ok && b.name === "search_products" && b.result.data.products?.length > 0 && <ProductResults products={b.result.data.products} />}
            {b.result?.ok && b.name === "create_checkout" && (checkout ? checkout(b.result.data, onPaid) : <CheckoutCard data={b.result.data} onPaid={onPaid} />)}
          </div>
        );
      })}
    </div>
  );
}

export function Playground({ slug, storeName, mcpUrl, paypalClientId, aiLabel, serverAi }: { slug: string; storeName: string; mcpUrl: string; paypalClientId: string; aiLabel: string; serverAi: boolean }) {
  const aiKey = useAiKey();
  const hasAi = serverAi || Boolean(aiKey);
  const label = aiKey ? PROVIDER_LABELS[aiKey.provider] : serverAi ? aiLabel : "No AI key";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function run(history: Msg[]) {
    setBusy(true);
    setMsgs([...history, { role: "assistant", blocks: [] }]);
    const update = (fn: (blocks: Block[]) => Block[]) =>
      setMsgs((cur) => {
        const copy = [...cur];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", blocks: fn(last.blocks) };
        return copy;
      });
    try {
      const res = await fetch(`/api/stores/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiKeyHeaders(aiKey) },
        body: JSON.stringify({ messages: historyFor(history) }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "text") {
            update((bl) => {
              const last = bl[bl.length - 1];
              return last?.kind === "text" ? [...bl.slice(0, -1), { kind: "text", text: last.text + ev.delta }] : [...bl, { kind: "text", text: ev.delta }];
            });
          } else if (ev.type === "tool_call") {
            update((bl) => [...bl, { kind: "tool", id: ev.id, name: ev.name, args: ev.args }]);
          } else if (ev.type === "tool_result") {
            update((bl) => bl.map((b) => (b.kind === "tool" && b.id === ev.id ? { ...b, result: { ok: ev.ok, data: ev.data, text: ev.text } } : b)));
          } else if (ev.type === "error") {
            update((bl) => [...bl, { kind: "text", text: ev.message }]);
          }
        }
      }
    } catch {
      update((bl) => [...bl, { kind: "text", text: "Connection problem. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function send(text: string) {
    if (!text.trim() || busy || !hasAi) return;
    const base = msgsRef.current.filter((m) => !(m.role === "assistant" && m.blocks.length === 0));
    void run([...base, { role: "user", text }]);
    setInput("");
  }

  function onPaid(orderId: string) {
    const base = msgsRef.current;
    void run([
      ...base,
      {
        role: "user",
        hidden: true,
        text: `[system] The buyer approved and PayPal captured the payment. Order ${orderId} is PAID. Confirm it to the user in one short sentence like "Paid. Order #${orderId.slice(0, 8)} confirmed".`,
      },
    ]);
  }

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId || "test", currency: "USD", intent: "capture" }}>
      <div className="mx-auto grid h-[calc(100vh-136px)] max-w-[1600px] grid-cols-1 gap-8 px-10 pb-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col">
          <div className="flex h-10 items-center justify-between text-[13px] text-fg3">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fg2" /> Agent · shopping at {storeName}</span>
            <span className="font-mono">{label} · same tools as MCP</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-hair bg-surface">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {msgs.length === 0 && !hasAi && (
                <div className="grid h-full place-items-center">
                  <div className="max-w-[460px]">
                    <p className="text-[17px] text-fg">This deployment runs without an AI key</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-fg2">
                      The agent needs a model. Add your own key to chat here, or connect any MCP client (Claude, ChatGPT, Cursor) to the endpoint on the right: it uses the same tools and brings its own model.
                    </p>
                    <AiKeyControl className="mt-5" />
                    <a href="/demo/playground" className="mt-5 inline-block text-[13px] text-fg3 underline-offset-4 transition-colors hover:text-fg hover:underline">
                      Or watch a recorded run of the full flow
                    </a>
                  </div>
                </div>
              )}
              {msgs.length === 0 && hasAi && (
                <div className="grid h-full place-items-center">
                  <div className="text-center">
                    <p className="text-fg3">Ask the agent to find and buy something.</p>
                    <button onClick={() => send("I need a black t-shirt in size M, under $40")} className="mt-4 h-10 rounded-lg border border-hair bg-raised px-4 text-[14px] transition-colors hover:border-fg3">
                      I need a black t-shirt in size M, under $40
                    </button>
                  </div>
                </div>
              )}
              <AnimatePresence initial={false}>
                {msgs.map((m, i) =>
                  m.role === "user" ? (
                    m.hidden ? null : (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex justify-end">
                        <div className="max-w-[80%] rounded-xl bg-raised px-4 py-3 text-[16px]">{m.text}</div>
                      </motion.div>
                    )
                  ) : (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      <Assistant blocks={m.blocks} onPaid={onPaid} />
                      {busy && i === msgs.length - 1 && m.blocks.every((b) => b.kind !== "text" || !b.text) && <Loader2 className="mt-2 h-4 w-4 animate-spin text-fg3" strokeWidth={1.5} />}
                    </motion.div>
                  ),
                )}
              </AnimatePresence>
              <div ref={bottom} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-hair p-3"
            >
              <input value={input} disabled={!hasAi} onChange={(e) => setInput(e.target.value)} placeholder={hasAi ? "Message" : "Add an AI key to chat"} className="h-12 flex-1 rounded-lg border border-hair bg-bg px-4 text-[16px] outline-none transition-colors placeholder:text-fg3 focus:border-fg3" />
              <button disabled={busy || !hasAi || !input.trim()} className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-[#1a0f0a] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-40" aria-label="Send">
                <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </section>

        <section className="hidden min-h-0 flex-col lg:flex">
          <div className="flex h-10 items-center justify-between text-[13px] text-fg3">
            <span className="flex items-center gap-2"><span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> Merchant · {storeName}</span>
            <span className="flex items-center gap-2 font-mono"><span className="max-w-[240px] truncate">{mcpUrl}</span><CopyButton text={mcpUrl} label="Copy" /></span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <WireLog slug={slug} limit={12} className="min-h-0 flex-1" legend />
            <div className="shrink-0 rounded-xl border border-hair bg-surface">
              <div className="flex h-10 items-center border-b border-hair px-4 text-[13px] text-fg3">Orders</div>
              <OrdersFeed slug={slug} limit={4} />
            </div>
          </div>
        </section>
      </div>
    </PayPalScriptProvider>
  );
}
