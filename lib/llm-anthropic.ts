import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Provider, StreamEvent, ToolDef } from "./llm-types";
import { LlmNotConfiguredError } from "./llm-types";

/**
 * Claude through the official Anthropic SDK.
 * - Server-side refusal fallbacks are on (`fallbacks: "default"`), so a declined request is retried on a
 *   fallback model inside the same call.
 * - Thinking is adaptive (the model default); the assistant's content blocks are replayed unchanged.
 */

const DEFAULT_MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let envClient: Anthropic | null = null;
/** The server's client from ANTHROPIC_API_KEY, or a one-off client for a key the visitor brought. */
function clientFor(apiKey?: string): Anthropic {
  if (apiKey) return new Anthropic({ apiKey, maxRetries: 1 });
  if (!process.env.ANTHROPIC_API_KEY) throw new LlmNotConfiguredError("ANTHROPIC_API_KEY is not set.");
  envClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return envClient;
}

const model = () => process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

/** System text goes in `system`; tool results are grouped into one user turn; replayed assistant content stays native. */
export function toAnthropic(messages: ChatMessage[]): { system: string; messages: Anthropic.Beta.BetaMessageParam[] } {
  const system: string[] = [];
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      system.push(m.content);
    } else if (m.role === "user") {
      if (m.content) out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      if (m.native) {
        out.push({ role: "assistant", content: m.native as Anthropic.Beta.BetaContentBlockParam[] });
        continue;
      }
      const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const c of m.toolCalls ?? []) {
        let input: unknown = {};
        try {
          input = c.arguments ? JSON.parse(c.arguments) : {};
        } catch {
          /* keep {} */
        }
        blocks.push({ type: "tool_use", id: c.id, name: c.name, input });
      }
      if (blocks.length) out.push({ role: "assistant", content: blocks });
    } else {
      const result: Anthropic.Beta.BetaToolResultBlockParam = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content };
      const last = out[out.length - 1];
      const lastIsResults =
        last?.role === "user" && Array.isArray(last.content) && last.content.every((b) => b.type === "tool_result");
      if (lastIsResults) (last.content as Anthropic.Beta.BetaContentBlockParam[]).push(result);
      else out.push({ role: "user", content: [result] });
    }
  }
  return { system: system.join("\n\n"), messages: out };
}

function toTools(tools?: ToolDef[]): Anthropic.Beta.BetaTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: { ...t.parameters, type: "object" } as Anthropic.Beta.BetaTool.InputSchema,
  }));
}

const textOf = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content.map((b) => (b.type === "text" ? b.text : "")).join("");

export function anthropicProvider(apiKey?: string): Provider {
  const getClient = () => clientFor(apiKey);
  return {
  id: "anthropic",
  label: "Claude",
  model: async () => model(),
  structuredModes: ["json_schema", "prompt"],

  async *chatStream({ messages, tools }): AsyncGenerator<StreamEvent> {
    const { system, messages: msgs } = toAnthropic(messages);
    const stream = getClient().beta.messages.stream({
      model: model(),
      max_tokens: 16000,
      system,
      messages: msgs,
      tools: toTools(tools),
      output_config: { effort: "low" }, // a shopping chat: short turns, fast replies
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield { type: "text", delta: ev.delta.text };
    }
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") {
      const note = "I can't help with that request.";
      yield { type: "text", delta: note };
      return yield { type: "done", content: note, toolCalls: [] };
    }
    // A tool call cut off by max_tokens may carry a partial input: never run it.
    const toolCalls =
      msg.stop_reason === "max_tokens"
        ? []
        : msg.content
            .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use")
            .map((b) => ({ id: b.id, name: b.name, arguments: JSON.stringify(b.input ?? {}) }));
    yield { type: "done", content: textOf(msg.content), toolCalls, native: msg.content };
  },

  async completeJson({ messages, mode, schema }) {
    const { system, messages: msgs } = toAnthropic(messages);
    const msg = await getClient().beta.messages.create({
      model: model(),
      max_tokens: 16000,
      system,
      messages: msgs,
      output_config: mode === "json_schema" ? { format: { type: "json_schema", schema } } : undefined,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    if (msg.stop_reason === "refusal") throw new Error("The model declined to extract this page.");
    return textOf(msg.content);
  },
};
}
