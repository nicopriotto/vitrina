"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-hair bg-raised px-3 text-[13px] text-fg transition-colors hover:border-fg3"
    >
      {done ? <Check className="h-4 w-4 text-pos" strokeWidth={1.5} /> : <Copy className="h-4 w-4 text-fg2" strokeWidth={1.5} />}
      {done ? "Copied" : label}
    </button>
  );
}
