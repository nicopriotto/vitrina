ALTER TABLE "orders" ADD COLUMN "shipping" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp;