import { describe, expect, it } from "vitest";
import { extractedProductSchema } from "@/lib/ingest/types";
import { extractJsonBlock, parseTextToolCall } from "@/lib/llm";

describe("extractedProductSchema", () => {
  it("accepts a valid product and applies defaults", () => {
    const p = extractedProductSchema.parse({ name: "Tee", price: 38000, currency: "ARS", variants: [{ color: "Black", size: "M" }] });
    expect(p.variants[0].in_stock).toBe(true);
    expect(p.in_stock).toBe(true);
    expect(p.description).toBe("");
  });
  it("rejects missing price or bad currency", () => {
    expect(extractedProductSchema.safeParse({ name: "Tee", currency: "ARS" }).success).toBe(false);
    expect(extractedProductSchema.safeParse({ name: "Tee", price: 1, currency: "pesos" }).success).toBe(false);
    expect(extractedProductSchema.safeParse({ name: "Tee", price: -5, currency: "USD" }).success).toBe(false);
  });
});

describe("llm helpers", () => {
  const tools = [{ name: "search_products", description: "", parameters: {} }];
  it("extracts the first balanced JSON block from prose", () => {
    expect(extractJsonBlock('Sure! ```json\n{"a": {"b": "}"}}\n``` done')).toBe('{"a": {"b": "}"}}');
    expect(extractJsonBlock("no json")).toBeNull();
  });
  it("parses a tool call emitted as text", () => {
    const call = parseTextToolCall('```json\n{"name":"search_products","parameters":{"query":"tee"}}\n```', tools);
    expect(call?.name).toBe("search_products");
    expect(JSON.parse(call!.arguments)).toEqual({ query: "tee" });
  });
  it("ignores unknown tools and normal prose", () => {
    expect(parseTextToolCall('{"name":"rm_rf","arguments":{}}', tools)).toBeNull();
    expect(parseTextToolCall("Hello there", tools)).toBeNull();
  });
});
