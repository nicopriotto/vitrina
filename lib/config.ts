import { z } from "zod";

const fxSchema = z.record(z.string(), z.number().positive());

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function fxRates(): Record<string, number> {
  try {
    return fxSchema.parse(JSON.parse(process.env.FX_RATES_JSON ?? '{"ARS":0.00085}'));
  } catch {
    return { ARS: 0.00085 };
  }
}

export const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
