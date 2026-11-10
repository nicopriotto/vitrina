"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DEMO_EMAIL } from "@/lib/demo";

/** Types the demo URL and email by itself, then waits for the click (or `?auto=1`). */
export function DemoLanding({ demoUrl }: { demoUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await sleep(900);
      for (let i = 1; i <= demoUrl.length && !cancelled; i++) {
        setUrl(demoUrl.slice(0, i));
        await sleep(32);
      }
      await sleep(350);
      for (let i = 1; i <= DEMO_EMAIL.length && !cancelled; i++) {
        setEmail(DEMO_EMAIL.slice(0, i));
        await sleep(26);
      }
      if (!cancelled) setArmed(true);
      if (!cancelled && new URLSearchParams(location.search).has("auto")) {
        await sleep(900);
        router.push("/demo/store?auto=1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoUrl, router]);

  const input = "h-12 w-full rounded-lg border border-hair bg-surface px-4 text-[15px] text-fg outline-none";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/demo/store");
      }}
      className="mt-10 max-w-[480px] space-y-4"
    >
      <label className="block">
        <span className="mb-2 block text-[13px] text-fg2">Store URL</span>
        <input className={`${input} font-mono text-sm`} readOnly value={url} placeholder="https://yourstore.com" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] text-fg2">Where should you get paid?</span>
        <input className={input} readOnly value={email} placeholder="PayPal sandbox business email" />
      </label>
      <button
        disabled={!armed}
        className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-[15px] font-medium text-[#1a0f0a] transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        Make it agent-ready <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </form>
  );
}
