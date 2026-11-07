export type ApiVariant = {
  id: string;
  label: string;
  attributes: Record<string, string>;
  priceOverride: string | null;
  inStock: boolean;
};

export type ApiProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: string;
  originalPrice: string | null;
  originalCurrency: string | null;
  inStock: boolean;
  externalUrl: string | null;
  variants: ApiVariant[];
};

export type ApiStore = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sourceUrl: string;
  status: "ingesting" | "ready" | "failed";
  errorMessage: string | null;
};

export type ApiOrder = {
  id: string;
  paypalOrderId: string | null;
  status: "CREATED" | "APPROVED" | "PAID" | "FAILED";
  items: { name: string; variantLabel: string | null; quantity: number; unitPrice: string }[];
  total: string;
  channel: "playground" | "mcp";
  createdAt: string;
  shipping?: { name: string | null; line1: string; line2?: string | null; city: string; state: string | null; postalCode: string | null; country: string } | null;
  shippedAt?: string | null;
};
