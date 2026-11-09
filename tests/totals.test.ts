import { describe, expect, it } from "vitest";
import { calculateTotal } from "@/lib/orders";
import { sumLines } from "@/lib/paypal";
import { toUsd } from "@/lib/ingest/currency";

describe("totals", () => {
  it("sums in cents without float drift", () => {
    expect(calculateTotal([{ unitPrice: "0.10", quantity: 3 }, { unitPrice: "0.20", quantity: 1 }])).toBe("0.50");
    expect(calculateTotal([{ unitPrice: "32.30", quantity: 2 }])).toBe("64.60");
  });
  it("matches PayPal item_total helper", () => {
    expect(sumLines([{ name: "a", unitAmount: "19.99", quantity: 3 }])).toBe("59.97");
  });
});

describe("toUsd", () => {
  it("converts with a fixed rate and rounds to 2 decimals", () => {
    expect(toUsd(38000, "ARS", { ARS: 0.00085 })).toBe(32.3);
    expect(toUsd(24000, "ARS", { ARS: 0.00085 })).toBe(20.4);
  });
  it("passes USD through and rejects unknown currencies", () => {
    expect(toUsd(12.345, "USD", {})).toBe(12.35);
    expect(toUsd(10, "XYZ", { ARS: 1 })).toBeNull();
  });
});
