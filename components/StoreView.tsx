"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { ProductCard } from "./ProductCard";
import { WireLog } from "./WireLog";
import { StoreNav } from "./StoreNav";
import type { ApiProduct, ApiStore } from "./types";

type Step = { id: number; message: string; progress: number };

type Tab = { id: string; steps?: string[]; note?: string; code?: string; hint?: string };

function tabsFor(slug: string, url: string): Tab[] {
  const curl = `curl -s ${url} \\\n  -H 'content-type: application/json' \\\n  -H 'accept: application/json, text/event-stream' \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
  return [
    { id: "Claude", steps: ["Open **Settings → Connectors → Add custom connector** and paste the URL.", "Ask for what you want, like **\u201ca black t-shirt in size M under $40\u201d**. You approve the payment on PayPal."] },
    { id: "ChatGPT", steps: ["Open **Settings → Connectors → Advanced** and turn on **Developer mode**.", "Choose **Create**, paste the URL and set authentication to none. Then pick the connector in a chat."], note: "Custom connectors need a ChatGPT plan that includes Developer mode." },
    { id: "Gemini CLI", code: `gemini mcp add --transport http ${slug} ${url}`, hint: "Gemini CLI. Run it once, then ask Gemini to shop." },
    { id: "Cursor", code: JSON.stringify({ mcpServers: { [slug]: { url } } }, null, 2), hint: "Add to ~/.cursor/mcp.json" },
    { id: "VS Code", code: JSON.stringify({ servers: { [slug]: { type: "http", url } } }, null, 2), hint: "Add to .vscode/mcp.json" },
    { id: "Claude Code", code: `claude mcp add --transport http ${slug} ${url}`, hint: "Run once in your terminal" },
    { id: "LLM APIs", steps: ["Claude, OpenAI and Llama models use these tools through function calling. The **Agent playground** does exactly that with the provider you configure.", "Fetch the tool schemas with the cURL tab (`tools/list`) and pass them as `tools` to any model API."] },
    { id: "Config JSON", code: JSON.stringify({ mcpServers: { [slug]: { type: "http", url } } }, null, 2), hint: "Generic MCP client config" },
    { id: "cURL", code: curl, hint: "List the tools by hand" },
  ];
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <span key={i} className="text-fg">{part}</span> : <span key={i}>{part}</span>))}
    </>
  );
}

export function Connect({ slug, mcpUrl }: { slug: string; mcpUrl: string }) {
  const tabs = tabsFor(slug, mcpUrl);
  const [id, setId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === id) ?? tabs[0];
  return (
    <div className="rounded-xl border border-hair bg-surface">
      <div className="flex items-center gap-3 border-b border-hair p-5">
        <span className="text-[14px] text-fg3">MCP endpoint</span>
        <code className="min-w-0 flex-1 truncate font-mono text-[15px]">{mcpUrl}</code>
        <CopyButton text={mcpUrl} />
      </div>
      <div className="flex gap-0.5 overflow-x-auto border-b border-hair px-3 pt-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setId(t.id)} className={`h-10 shrink-0 rounded-t-md px-3 text-[14px] transition-colors ${id === t.id ? "bg-raised text-fg" : "text-fg3 hover:text-fg"}`}>
            {t.id}
          </button>
        ))}
      </div>
      <div className="min-h-[170px] p-5">
        {tab.steps && (
          <ol className="space-y-3 text-[16px] text-fg2">
            {tab.steps.map((st, i) => (
              <li key={i} className="flex gap-4"><span className="tnum font-mono text-fg3">{i + 1}</span><span><Rich text={st} /></span></li>
            ))}
          </ol>
        )}
        {tab.code && (
          <div className="relative">
            {tab.hint && <div className="mb-2 text-[13px] text-fg3">{tab.hint}</div>}
            <pre className="overflow-x-auto rounded-lg bg-deep p-4 pr-24 font-mono text-[13px] leading-5 text-fg2">{tab.code}</pre>
            <div className="absolute right-3 top-9"><CopyButton text={tab.code} /></div>
          </div>
        )}
        {tab.note && <p className="mt-4 text-[13px] text-fg3">{tab.note}</p>}
        {/localhost|127\.0\.0\.1/.test(mcpUrl) && <p className="mt-3 text-[13px] text-fg3">This URL is local. Remote clients need a public URL, so use the deployed app or a tunnel.</p>}
      </div>
    </div>
  );
}

export function StoreView({ initialStore, mcpUrl }: { initialStore: ApiStore; mcpUrl: string }) {
  const [store, setStore] = useState(initialStore);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [progress, setProgress] = useState(initialStore.status === "ingesting" ? 3 : 100);
  const loadedFor = useRef<string>("");

  async function load() {
    const res = await fetch(`/api/stores/${store.slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setStore((s) => ({ ...s, ...body.store }));
    setProducts(body.products);
  }

  useEffect(() => {
    if (loadedFor.current === store.slug) return;
    loadedFor.current = store.slug;
    void load();
    if (initialStore.status !== "ingesting") return;

    const es = new EventSource(`/api/stores/${store.slug}/events`);
    es.addEventListener("progress", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setSteps((prev) => (prev.some((s) => s.id === d.id) ? prev : [...prev, { id: d.id, message: d.message, progress: d.progress }]));
      setProgress(d.progress);
    });
    es.addEventListener("products", () => void load());
    es.addEventListener("status", async () => {
      await load();
      es.close();
    });
    es.onerror = () => {
      es.close();
      void load();
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (store.status === "failed") {
    return (
      <div className="mx-auto max-w-[560px] px-10 py-32">
        <AlertTriangle className="h-5 w-5 text-neg" strokeWidth={1.5} />
        <h1 className="mt-4 text-[28px] font-medium tracking-tight">That didn&apos;t work</h1>
        <p className="mt-2 text-fg2">{store.errorMessage ?? "We couldn't find products on this site. Try the demo store."}</p>
        <Link href="/" className="mt-8 inline-flex h-11 items-center rounded-lg bg-raised px-5 text-[15px] transition-colors hover:bg-hair">Back to start</Link>
      </div>
    );
  }

  if (store.status === "ingesting") {
    return (
      <div className="mx-auto max-w-[1600px] px-10 pb-24 pt-8">
        <div className="font-mono text-[13px] text-fg3">{new URL(store.sourceUrl).host}</div>
        <h1 className="mt-2 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">Making this store agent-ready</h1>
        <div className="mt-8 h-px w-full bg-hair">
          <motion.div className="h-px bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-10 grid gap-16 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ul className="space-y-4 font-mono text-[14px]">
            <AnimatePresence initial={false}>
              {steps.map((s, i) => {
                const last = i === steps.length - 1;
                return (
                  <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-3">
                    {last ? <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={1.5} /> : <Check className="h-4 w-4 text-pos" strokeWidth={1.5} />}
                    <span className={last ? "text-fg" : "text-fg3"}>{s.message}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {products.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
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
    <StoreNav name={store.name} slug={store.slug} />
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-[1600px] px-10 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-fg3">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> Endpoint live · <span className="font-mono">{new URL(store.sourceUrl).host}</span>
          </div>
          <h1 className="mt-3 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">{store.name}</h1>
          {store.description && <p className="mt-2 max-w-xl text-fg2">{store.description}</p>}
        </div>
        <div className="flex gap-3">
          <Link href={`/stores/${store.slug}/orders`} className="inline-flex h-11 items-center rounded-lg border border-hair bg-raised px-5 text-[15px] transition-colors hover:border-fg3">Orders</Link>
          <Link href={`/stores/${store.slug}/playground`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-[#1a0f0a] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]">
            Try it with an agent <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Connect slug={store.slug} mcpUrl={mcpUrl} />
        <WireLog slug={store.slug} limit={6} />
      </div>

      <div className="mb-5 mt-14 flex items-baseline justify-between">
        <h2 className="text-[17px] font-medium">Catalog</h2>
        <span className="tnum font-mono text-[13px] text-fg3">{products.length} products</span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 xl:grid-cols-6">
        {products.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <ProductCard p={p} />
          </motion.div>
        ))}
      </div>
    </motion.div>
    </>
  );
}
