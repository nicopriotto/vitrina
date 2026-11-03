import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sourceUrl: text("source_url").notNull(),
  description: text("description").notNull().default(""),
  logoUrl: text("logo_url"),
  payeeEmail: text("payee_email").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ["ingesting", "ready", "failed"] })
    .notNull()
    .default("ingesting"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    externalUrl: text("external_url"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    originalPrice: numeric("original_price", { precision: 14, scale: 2 }),
    originalCurrency: text("original_currency"),
    inStock: boolean("in_stock").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("products_store_idx").on(t.storeId)],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
    priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
    inStock: boolean("in_stock").notNull().default(true),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const ingestionEvents = pgTable(
  "ingestion_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    message: text("message").notNull(),
    progress: integer("progress").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_store_idx").on(t.storeId)],
);

export type ShippingAddress = { name: string | null; line1: string; line2?: string | null; city: string; state: string | null; postalCode: string | null; country: string };

export type OrderItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: string;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    paypalOrderId: text("paypal_order_id").unique(),
    status: text("status", { enum: ["CREATED", "APPROVED", "PAID", "FAILED"] })
      .notNull()
      .default("CREATED"),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    buyerEmail: text("buyer_email"),
    /** Ship-to address from the buyer's PayPal account, saved on capture. */
    shipping: jsonb("shipping").$type<ShippingAddress>(),
    /** Set when the merchant marks the order as shipped. */
    shippedAt: timestamp("shipped_at"),
    channel: text("channel", { enum: ["playground", "mcp"] }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("orders_store_idx").on(t.storeId)],
);

export const toolEvents = pgTable(
  "tool_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    tool: text("tool").notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull().default({}),
    ok: boolean("ok").notNull(),
    ms: integer("ms").notNull(),
    summary: text("summary").notNull().default(""),
    channel: text("channel", { enum: ["playground", "mcp"] }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("tool_events_store_idx").on(t.storeId, t.id)],
);

export type Store = typeof stores.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Order = typeof orders.$inferSelect;
