"use client";

import { useCallback, useEffect, useState } from "react";
import { PRODUCTS, priceUsd } from "@/app/(mock)/mock/lumen/data";
import type { ApiOrder, ApiProduct } from "@/components/types";
import type { WireEvent } from "@/components/WireLog";

/**
 * Everything below is mock data for recording the demo video. No database, no LLM, no PayPal.
 * State that must survive across pages and browser tabs lives in localStorage.
 */

import { DEMO_SLUG } from "./demo-const";
export { DEMO_SLUG };
export const DEMO_STORE = {
  slug: DEMO_SLUG,
  name: "Lumen Studio",
  description: "Quiet essentials, cut and sewn in Brooklyn.",
  host: "lumenstudio.com",
};
export const DEMO_EMAIL = "lumen-store@business.example.com";
const usd = (ars: number) => priceUsd({ priceArs: ars });

export const DEMO_PRODUCTS: ApiProduct[] = PRODUCTS.map((p) => ({
  id: p.handle,
  name: p.name,
  description: p.description,
  imageUrl: p.colors[0].image,
  price: usd(p.priceArs).toFixed(2),
  originalPrice: null,
  originalCurrency: null,
  inStock: true,
  externalUrl: `/mock/lumen/p/${p.handle}`,
  variants: p.colors.flatMap((c) =>
    p.sizes.map((s) => ({
      id: `${p.handle}:${c.name}:${s}`,
      label: `${c.name} / ${s}`,
      attributes: { color: c.name, size: s },
      priceOverride: null,
      inStock: !p.soldOut.includes(`${c.name}/${s}`),
    })),
  ),
}));

const N = DEMO_PRODUCTS.length;

export const INGEST_STEPS: { message: string; progress: number; products?: number; wait: number }[] = [
  { message: "Fetching site…", progress: 5, wait: 900 },
  { message: "Finding products…", progress: 15, wait: 900 },
  { message: `Found ${N} product pages`, progress: 25, wait: 700 },
  ...DEMO_PRODUCTS.map((_, i) => ({ message: `Reading product ${i + 1} of ${N}`, progress: 25 + Math.round(((i + 1) / N) * 55), products: i + 1, wait: 200 })),
  { message: "Building catalog…", progress: 88, wait: 900 },
  { message: "Publishing agent endpoint…", progress: 96, wait: 900 },
  { message: `Ready: ${N} products live`, progress: 100, wait: 400 },
];

export function searchResult() {
  const tee = DEMO_PRODUCTS.find((p) => p.id === "remera-classic")!;
  const breton = DEMO_PRODUCTS.find((p) => p.id === "remera-breton")!;
  return [
    { id: tee.id, name: tee.name, price_usd: Number(tee.price), image_url: tee.imageUrl, variants: [{ id: "remera-classic:Black:M", label: "Black / M" }] },
    { id: breton.id, name: breton.name, price_usd: Number(breton.price), image_url: breton.imageUrl, variants: [{ id: "remera-breton:Navy Stripe:M", label: "Navy Stripe / M" }] },
  ];
}

export const MOCK_ORDER_ID = "7e1c4a90-5b2d-4f63-9a18-c3d2e1f0a4b7";
export const MOCK_TOTAL = DEMO_PRODUCTS[0].price;
/** Sam's ship-to, as PayPal would return it from his account. */
export const MOCK_SHIPPING = { name: "Sam Carter", line1: "88 Kent Ave", city: "Brooklyn", state: "NY", postalCode: "11249", country: "US" };

const seedOrders: ApiOrder[] = [
  { id: "a41f09c2-77aa-4d10-b1e5-0c9b2d3e4f51", paypalOrderId: "5MN66092LP8240417", status: "PAID", items: [{ name: "Essential Hoodie", variantLabel: "Oat / L", quantity: 1, unitPrice: String(usd(98000).toFixed(2)) }], total: usd(98000).toFixed(2), channel: "mcp", createdAt: "2026-11-09T14:02:11Z", shipping: { name: "Dana Whitfield", line1: "1420 Grand St", city: "Hoboken", state: "NJ", postalCode: "07030", country: "US" }, shippedAt: null },
  { id: "09bd3e77-1c2a-4e8f-a6d4-5b7c8d9e0f12", paypalOrderId: "2KD91834RT5521930", status: "PAID", items: [{ name: "Straight Jeans", variantLabel: "Light Wash / 32", quantity: 1, unitPrice: usd(89000).toFixed(2) }, { name: "Breton Stripe Tee", variantLabel: "Navy Stripe / M", quantity: 1, unitPrice: usd(44000).toFixed(2) }], total: (usd(89000) + usd(44000)).toFixed(2), channel: "playground", createdAt: "2026-11-09T13:41:55Z", shipping: { name: "Leo Marquez", line1: "77 Ainslie St", city: "Brooklyn", state: "NY", postalCode: "11211", country: "US" }, shippedAt: "2026-11-09T16:10:00Z" },
];

export const ORDERS_KEY = "vitrina-demo-orders";
export const WIRE_KEY = "vitrina-demo-wire";

function readKey<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  } catch {
    return initial;
  }
}

/** State mirrored in localStorage, updated live across tabs through `storage` events. */
export function useShared<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    setValue(readKey(key, initial));
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) setValue(readKey(key, initial));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (fn: (prev: T) => T) => {
      const next = fn(readKey(key, initial));
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      setValue(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, update] as const;
}

export const useDemoOrders = () => useShared<ApiOrder[]>(ORDERS_KEY, seedOrders);
export const useDemoWire = () => useShared<WireEvent[]>(WIRE_KEY, []);

export function resetDemo() {
  try {
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(WIRE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  } catch {
    /* ignore */
  }
}

export function wireEvent(tool: string, args: Record<string, unknown>, summary: string, ms: number, channel: "playground" | "mcp" = "playground"): WireEvent {
  return { id: Date.now() + Math.floor(Math.random() * 1000), tool, args, ok: true, ms, summary, channel, createdAt: new Date().toISOString() };
}


