import OpenAI from "openai";
import type { ChatMessage, Provider, ProviderId, StreamEvent, ToolCall, ToolDef } from "./llm-types";
import { LlmNotConfiguredError, newCallId } from "./llm-types";

/**
 * Chat Completions adapter, used for OpenAI and for Meta Llama (OpenAI-compatible endpoint).
 * Llama sometimes writes a tool call as JSON text, so its replies are checked for that.
 */

type Config = {
  id: ProviderId;
  label: string;
  keyVar: string;
  baseUrlVar: string;
  modelVar: string;
  defaultBaseUrl?: string;
  defaultModel: string;
  /** OpenAI's reasoning models reject a custom temperature; Llama is steadier at a low one. */
  temperature?: number;
  /** Ask GET /models and fall back to a close model id when the configured one is missing. */
  resolveModel?: (ids: string[], wanted: string) => string;
};

/** Detect `{"name": "...", "arguments"|"parameters": {...}}` (optionally fenced) written as text. */
export function parseTextToolCall(content: string, tools?: ToolDef[]): ToolCall | null {
  if (!tools?.length) return null;
  const stripped = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!stripped.startsWith("{")) return null;
  try {
    const obj = JSON.parse(stripped);
    const name = obj.name ?? obj.function?.name ?? obj.tool;
    const args = obj.arguments ?? obj.parameters ?? obj.function?.arguments ?? obj.input ?? {};
    if (typeof name !== "string" || !tools.some((t) => t.name === name)) return null;
    return { id: newCallId(), name, arguments: typeof args === "string" ? args : JSON.stringify(args) };
  } catch {
    return null;
  }
}

export function toOpenAi(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
    if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
    if (m.role === "assistant") {
      if (!m.toolCalls?.length) return { role: "assistant", content: m.content };
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.arguments } })),
      };
    }
    return { role: m.role, content: m.content };
  });
}

function toTools(tools?: ToolDef[]) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** One provider per key: the server's (from env) or a key the visitor brought for a single request. */
export function chatCompletionsProvider(cfg: Config, ownKey?: string): Provider {
  let client: OpenAI | null = null;
  let resolved: string | null = null;

  const getClient = () => {
    const apiKey = ownKey || process.env[cfg.keyVar];
    if (!apiKey) throw new LlmNotConfiguredError(`${cfg.keyVar} is not set.`);
    client ??= new OpenAI({ apiKey, baseURL: process.env[cfg.baseUrlVar] || cfg.defaultBaseUrl, ...(ownKey ? { maxRetries: 1 } : {}) });
    return client;
  };

  const model = async () => {
    if (resolved) return resolved;
    const wanted = process.env[cfg.modelVar] || cfg.defaultModel;
    if (!cfg.resolveModel) return (resolved = wanted);
    try {
      const ids: string[] = [];
      for await (const m of getClient().models.list()) ids.push(m.id);
      resolved = ids.length === 0 || ids.includes(wanted) ? wanted : cfg.resolveModel(ids, wanted);
      if (resolved !== wanted) console.warn(`[llm] model "${wanted}" not available, using "${resolved}"`);
    } catch (e) {
      if (e instanceof LlmNotConfiguredError) throw e;
      resolved = wanted;
    }
    return resolved;
  };

  const temp = (t: number) => (cfg.temperature === undefined ? {} : { temperature: t });

  return {
    id: cfg.id,
    label: cfg.label,
    model,
    structuredModes: ["json_schema", "tool", "prompt"],

    async *chatStream({ messages, tools }): AsyncGenerator<StreamEvent> {
      const stream = await getClient().chat.completions.create({
        model: await model(),
        messages: toOpenAi(messages),
        tools: toTools(tools),
        ...temp(cfg.temperature ?? 0),
        stream: true,
      });

      let content = "";
      let emitted = 0;
      const calls = new Map<number, ToolCall>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          // A reply that starts like JSON may be a textual tool call: hold it back until the end.
          const holdBack = Boolean(tools?.length) && /^\s*(```|\{)/.test(content);
          if (!holdBack) {
            yield { type: "text", delta: content.slice(emitted) };
            emitted = content.length;
          }
        }
        for (const tc of delta.tool_calls ?? []) {
          const cur = calls.get(tc.index) ?? { id: "", name: "", arguments: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.arguments += tc.function.arguments;
          calls.set(tc.index, cur);
        }
      }

      let toolCalls = [...calls.values()].filter((c) => c.name).map((c) => ({ ...c, id: c.id || newCallId() }));
      if (toolCalls.length === 0) {
        const textual = parseTextToolCall(content, tools);
        if (textual) {
          toolCalls = [textual];
          content = "";
        } else if (emitted < content.length) {
          yield { type: "text", delta: content.slice(emitted) };
        }
      }
      yield { type: "done", content, toolCalls };
    },

    async completeJson({ messages, mode, name, schema }) {
      const base = { model: await model(), messages: toOpenAi(messages), ...temp(0) };
      if (mode === "json_schema") {
        const res = await getClient().chat.completions.create({
          ...base,
          response_format: { type: "json_schema", json_schema: { name, schema } },
        });
        return res.choices[0]?.message?.content ?? "";
      }
      if (mode === "tool") {
        const res = await getClient().chat.completions.create({
          ...base,
          tools: [{ type: "function", function: { name, parameters: schema } }],
          tool_choice: { type: "function", function: { name } },
        });
        const m = res.choices[0]?.message;
        const tc = m?.tool_calls?.find((c) => c.type === "function");
        return tc && tc.type === "function" ? tc.function.arguments : (m?.content ?? "");
      }
      const res = await getClient().chat.completions.create(base);
      return res.choices[0]?.message?.content ?? "";
    },
  };
}

const OPENAI: Config = {
  id: "openai",
  label: "OpenAI",
  keyVar: "OPENAI_API_KEY",
  baseUrlVar: "OPENAI_BASE_URL",
  modelVar: "OPENAI_MODEL",
  defaultModel: "gpt-5.5",
};

const LLAMA: Config = {
  id: "llama",
  label: "Llama",
  keyVar: "LLAMA_API_KEY",
  baseUrlVar: "LLAMA_BASE_URL",
  modelVar: "LLAMA_MODEL",
  defaultBaseUrl: "https://api.llama.com/compat/v1/",
  defaultModel: "Llama-4-Maverick-17B-128E-Instruct-FP8",
  temperature: 0.1,
  resolveModel: (ids, wanted) => ids.find((id) => /maverick/i.test(id)) ?? ids.find((id) => /llama/i.test(id)) ?? wanted,
};

const envOpenai = chatCompletionsProvider(OPENAI);
const envLlama = chatCompletionsProvider(LLAMA);
export const openaiProvider = (apiKey?: string) => (apiKey ? chatCompletionsProvider(OPENAI, apiKey) : envOpenai);
export const llamaProvider = (apiKey?: string) => (apiKey ? chatCompletionsProvider(LLAMA, apiKey) : envLlama);
