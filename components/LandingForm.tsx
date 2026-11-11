"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { AiKeyControl } from "@/components/AiKeyControl";
import { aiKeyHeaders, useAiKey } from "@/lib/ai-key-client";

export function LandingForm({ demoUrl, serverAi }: { demoUrl: string; serverAi: boolean }) {
  const router = useRouter();
  const aiKey = useAiKey();
  const hasAi = serverAi || Boolean(aiKey);
  const [showKey, setShowKey] = useState(false);
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiKeyHeaders(aiKey) },
        body: JSON.stringify({ url: url.trim(), payeeEmail: email.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      router.push(`/stores/${body.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const input =
    "h-12 w-full rounded-lg border border-hair bg-surface px-4 text-[15px] text-fg placeholder:text-fg3 outline-none transition-colors focus:border-fg3";

  return (
    <form onSubmit={submit} className="mt-10 max-w-[480px] space-y-4">
      <label className="block">
        <span className="mb-2 block text-[13px] text-fg2">Store URL</span>
        <input className={`${input} font-mono text-sm`} required type="url" placeholder="https://yourstore.com" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] text-fg2">Where should you get paid?</span>
        <input className={input} required type="email" placeholder="PayPal sandbox business email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p className="text-sm text-neg">{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button
          disabled={busy}
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-[#1a0f0a] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
          Make it agent-ready
          {!busy && <ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
        </button>
        <button type="button" onClick={() => setUrl(hasAi ? demoUrl : `${demoUrl}?jsonld=1`)} className="h-12 rounded-lg border border-hair bg-raised px-5 text-[15px] text-fg transition-colors hover:border-fg3">
          Use demo store
        </button>
      </div>
      {!serverAi && (
        <div className="pt-2 text-[13px] leading-relaxed text-fg3">
          {aiKey ? (
            <AiKeyControl />
          ) : (
            <>
              <p>
                This deployment runs without an AI key. The demo store loads from its structured data, and the MCP endpoint works with any agent.{" "}
                <button type="button" onClick={() => setShowKey(!showKey)} className="text-fg2 underline underline-offset-4 transition-colors hover:text-fg">
                  Use your own AI key
                </button>{" "}
                to read plain HTML stores and chat in the Agent playground.
              </p>
              {showKey && <AiKeyControl className="mt-3" />}
            </>
          )}
        </div>
      )}
    </form>
  );
}
