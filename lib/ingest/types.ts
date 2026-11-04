import { z } from "zod";

export const extractedVariantSchema = z.object({
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  in_stock: z.boolean().default(true),
});

/** Schema the LLM must satisfy for each product page. */
export const extractedProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  currency: z.string().min(3).max(3).describe("ISO 4217 code, e.g. USD, ARS"),
  image_url: z.string().nullable().optional(),
  variants: z.array(extractedVariantSchema).default([]),
  in_stock: z.boolean().default(true),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema> & {
  external_url?: string | null;
};

export const productListSchema = z.object({
  products: z.array(extractedProductSchema),
});

export const storeInfoSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export function variantLabel(v: { color?: string | null; size?: string | null }): string {
  return [v.color, v.size].filter(Boolean).join(" / ") || "Default";
}
