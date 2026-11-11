"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { PROVIDER_LABELS, saveAiKey, useAiKey, type VisitorAiKey } from "@/lib/ai-key-client";

/** Lets a visitor use their own AI key. Kept in this browser only. */
export function AiKeyControl({ className = "" }: { className?: string }) {
  const key = useAiKey();
  const [provider, setProvider] = useState<VisitorAiKey["provider"]>("anthropic");
  const [value, setValue] = useState("");

  if (key) {
    return (
      <div className={`flex flex-wrap items-center gap-3 text-[13px] text-fg2 ${className}`}>
        <KeyRound className="h-4 w-4 text-fg3" strokeWidth={1.5} />
        <span>
          Using your {PROVIDER_LABELS[key.provider]} key <span className="font-mono text-fg3">…{key.apiKey.slice(-4)}</span>
        </span>
        <button type="button" onClick={() => saveAiKey(null)} className="text-fg3 underline-offset-4 transition-colors hover:text-fg hover:underline">
          Remove
        </button>
      </div>
    );
  }

  // Not a <form>: it is rendered inside the landing page's form.
  const submit = () => {
    if (value.trim()) saveAiKey({ provider, apiKey: value.trim() });
    setValue("");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as VisitorAiKey["provider"])}
          className="h-10 rounded-lg border border-hair bg-bg px-3 text-[14px] text-fg outline-none focus:border-fg3"
          aria-label="AI provider"
        >
          {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Your API key"
          className="h-10 min-w-0 flex-1 rounded-lg border border-hair bg-bg px-3 font-mono text-[13px] text-fg outline-none placeholder:text-fg3 focus:border-fg3"
        />
        <button type="button" onClick={submit} disabled={!value.trim()} className="h-10 rounded-lg border border-hair bg-raised px-4 text-[14px] transition-colors hover:border-fg3 disabled:opacity-40">
          Use key
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-fg3">Stays in this browser and is sent only with your requests. Vitrina never stores it.</p>
    </div>
  );
}
