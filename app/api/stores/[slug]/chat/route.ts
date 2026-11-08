import { z } from "zod";
import { chatStream, llmConfigured, llmSetupHint, type ChatMessage, type ToolCall } from "@/lib/llm";
import { executeTool, llmTools } from "@/lib/agent-tools";
import { getStoreBySlug } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 6;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) }))
    .min(1)
    .max(40),
});

function systemPrompt(store: { name: string; description: string }) {
  return `You are the shopping assistant for ${store.name}${store.description ? ` (${store.description})` : ""}.
Only sell products from this store, using the tools. Never invent products, prices or availability: call search_products first.
Reply in the user's language and be concise. When the user has chosen a product, make sure a variant (size/color) is chosen, then call create_checkout.
You cannot pay for the user: after create_checkout, tell them to review and approve the payment with the PayPal button shown below your message.
Messages starting with [system] report payment events; confirm them briefly (e.g. "Paid. Order #... confirmed").`;
}

/** NDJSON stream of events: text | tool_call | tool_result | error | done. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Not found", { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const enc = new TextEncoder();
  const tools = llmTools();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        if (!llmConfigured()) {
          send({ type: "error", message: `The AI agent is not configured yet. ${llmSetupHint()}` });
          return;
        }
        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt(store) },
          ...parsed.data.messages.map((m): ChatMessage => ({ role: m.role, content: m.content })),
        ];

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          let content = "";
          let toolCalls: ToolCall[] = [];
          let native: unknown;
          for await (const ev of chatStream({ messages, tools })) {
            if (ev.type === "text") send({ type: "text", delta: ev.delta });
            else {
              content = ev.content;
              toolCalls = ev.toolCalls;
              native = ev.native;
            }
          }
          if (toolCalls.length === 0) break;

          messages.push({ role: "assistant", content, toolCalls, native });
          for (const call of toolCalls) {
            let args: unknown = {};
            try {
              args = call.arguments ? JSON.parse(call.arguments) : {};
            } catch {
              /* validated (and rejected) inside executeTool */
            }
            send({ type: "tool_call", id: call.id, name: call.name, args });
            const result = await executeTool({ store, channel: "playground" }, call.name, args);
            send({ type: "tool_result", id: call.id, name: call.name, ok: result.ok, data: result.data, text: result.text });
            messages.push({ role: "tool", toolCallId: call.id, name: call.name, content: `${result.text}\n${JSON.stringify(result.data)}`.slice(0, 6000) });
          }
          if (turn === MAX_TURNS - 1) send({ type: "text", delta: "\n\n(Stopped: too many steps. Please try again.)" });
        }
      } catch (e) {
        console.error("[chat]", e);
        send({ type: "error", message: "The agent hit a problem. Please try again." });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache, no-transform" } });
}
