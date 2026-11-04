import { fxRates } from "@/lib/config";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convert an amount to USD using the fixed configurable rates. Returns null if no rate exists. */
export function toUsd(amount: number, currency: string, rates = fxRates()): number | null {
  const c = currency.toUpperCase();
  if (c === "USD") return round2(amount);
  const rate = rates[c];
  return rate ? round2(amount * rate) : null;
}
