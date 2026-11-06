import { PAYPAL_BASE } from "@/lib/config";
import type { Store } from "@/lib/db/schema";

export type PayPalLine = { name: string; unitAmount: string; quantity: number };

/** Where the buyer wants the order sent, as PayPal returns it (shipping_preference GET_FROM_FILE). */
export type ShippingAddress = { name: string | null; line1: string; line2?: string | null; city: string; state: string | null; postalCode: string | null; country: string };

export function toShipping(unit: any): ShippingAddress | null {
  const a = unit?.shipping?.address;
  if (!a?.address_line_1) return null;
  return {
    name: unit.shipping?.name?.full_name ?? null,
    line1: a.address_line_1,
    line2: a.address_line_2 ?? null,
    city: a.admin_area_2 ?? "",
    state: a.admin_area_1 ?? null,
    postalCode: a.postal_code ?? null,
    country: a.country_code ?? "",
  };
}

export type PayPalOrder = {
  id: string;
  status: string;
  approveUrl: string | null;
  payerEmail: string | null;
  shipping: ShippingAddress | null;
  raw: any;
};

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: any,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new PayPalError("PayPal authentication failed", res.status, body);
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 };
  return cached.token;
}

async function ppFetch(path: string, init: RequestInit & { requestId?: string } = {}) {
  const token = await getAccessToken();
  const { requestId, ...rest } = init;
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      ...(rest.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.details?.[0]?.description ?? body?.message ?? res.statusText;
    throw new PayPalError(`PayPal error: ${detail}`, res.status, body);
  }
  return body;
}

function toOrder(body: any): PayPalOrder {
  const link = (body.links ?? []).find((l: any) => l.rel === "payer-action") ?? (body.links ?? []).find((l: any) => l.rel === "approve");
  return {
    id: body.id,
    status: body.status,
    approveUrl: link?.href ?? null,
    payerEmail: body.payer?.email_address ?? null,
    shipping: toShipping(body.purchase_units?.[0]),
    raw: body,
  };
}

/** Sum line items in integer cents to avoid float drift. Returns a 2-decimal string. */
export function sumLines(lines: PayPalLine[]): string {
  const cents = lines.reduce((acc, l) => acc + Math.round(Number(l.unitAmount) * 100) * l.quantity, 0);
  return (cents / 100).toFixed(2);
}

export async function createOrder(input: {
  orderId: string;
  store: Pick<Store, "name" | "payeeEmail">;
  items: PayPalLine[];
  total: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalOrder> {
  const { store, items, total } = input;
  const body = await ppFetch("/v2/checkout/orders", {
    method: "POST",
    requestId: `vitrina-${input.orderId}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          description: `Order from ${store.name}`.slice(0, 127),
          payee: { email_address: store.payeeEmail },
          items: items.map((i) => ({
            name: i.name.slice(0, 127),
            quantity: String(i.quantity),
            unit_amount: { currency_code: "USD", value: i.unitAmount },
            category: "PHYSICAL_GOODS",
          })),
          amount: {
            currency_code: "USD",
            value: total,
            breakdown: { item_total: { currency_code: "USD", value: total } },
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: store.name.slice(0, 127),
            user_action: "PAY_NOW",
            shipping_preference: "GET_FROM_FILE",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });
  return toOrder(body);
}

export async function getOrder(id: string): Promise<PayPalOrder> {
  return toOrder(await ppFetch(`/v2/checkout/orders/${encodeURIComponent(id)}`));
}

export async function captureOrder(id: string): Promise<PayPalOrder> {
  try {
    return toOrder(
      await ppFetch(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
        method: "POST",
        requestId: `vitrina-capture-${id}`,
        body: "{}",
      }),
    );
  } catch (e) {
    // Someone else (webhook / return page / playground) already captured it.
    if (e instanceof PayPalError && e.body?.details?.some((d: any) => d.issue === "ORDER_ALREADY_CAPTURED")) {
      return getOrder(id);
    }
    throw e;
  }
}

export async function verifyWebhookSignature(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const body = await ppFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  return body.verification_status === "SUCCESS";
}
