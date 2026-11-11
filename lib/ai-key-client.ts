"use client";

import { useEffect, useState } from "react";

/**
 * A visitor's own AI key. It lives only in this browser (localStorage) and is sent as
 * request headers; the server uses it for that request and never stores it.
 */
export type VisitorAiKey = { provider: "anthropic" | "openai" | "llama"; apiKey: string };

const STORAGE_KEY = "vitrina.ai-key";
const EVENT = "vitrina:ai-key";

export const PROVIDER_LABELS: Record<VisitorAiKey["provider"], string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  llama: "Llama",
};

function read(): VisitorAiKey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as VisitorAiKey;
    return v?.apiKey && v.provider in PROVIDER_LABELS ? v : null;
  } catch {
    return null;
  }
}

export function saveAiKey(key: VisitorAiKey | null) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the key just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useAiKey(): VisitorAiKey | null {
  const [key, setKey] = useState<VisitorAiKey | null>(null);
  useEffect(() => {
    const sync = () => setKey(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return key;
}

export function aiKeyHeaders(key: VisitorAiKey | null): Record<string, string> {
  return key ? { "x-ai-provider": key.provider, "x-ai-key": key.apiKey } : {};
}
