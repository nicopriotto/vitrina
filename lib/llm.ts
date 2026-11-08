import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { anthropicProvider } from "./llm-anthropic";
import { llamaProvider, openaiProvider } from "./llm-openai";
import type { ChatMessage, Provider, ProviderId, StreamEvent, ToolDef } from "./llm-types";
import { LlmNotConfiguredError } from "./llm-types";

/**
 * Provider-agnostic LLM layer. The app only uses `chatStream`, `extractStructured`,
 * `llmConfigured` and `llmInfo` from here.
 *
 * Pick the provider with AI_PROVIDER=anthropic|openai|llama. Without it, the first
 * provider whose key is set wins, in that order.
 */

export type { ChatMessage, StreamEvent, ToolCall, ToolDef } from "./llm-types";
export { LlmNotConfiguredError } from "./llm-types";
export { parseTextToolCall } from "./llm-openai";

const PROVIDERS: Record<ProviderId, { provider: Provider; keyVar: string }> = {
  anthropic: { provider: anthropicProvider, keyVar: "ANTHROPIC_API_KEY" },
  openai: { provider: openaiProvider, keyVar: "OPENAI_API_KEY" },
  llama: { provider: llamaProvider, keyVar: "LLAMA_API_KEY" },
};
const ORDER: ProviderId[] = ["anthropic", "openai", "llama"];

export function providerId(): ProviderId | null {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (wanted) {
    if (!(wanted in PROVIDERS)) throw new Error(`AI_PROVIDER must be one of ${ORDER.join(", ")} (got "${wanted}").`);
    return wanted as ProviderId;
  }
  return ORDER.find((id) => process.env[PROVIDERS[id].keyVar]) ?? null;
}

function provider(): Provider {
  const id = providerId();
  if (!id) throw new LlmNotConfiguredError(`No AI provider key is set. Add one of ${keyVars()} to .env.local.`);
  return PROVIDERS[id].provider;
}

const keyVars = () => ORDER.map((id) => PROVIDERS[id].keyVar).join(", ");

export function llmConfigured(): boolean {
  const id = providerId();
  return Boolean(id && process.env[PROVIDERS[id].keyVar]);
}

/** What to tell a user when AI is off. */
export function llmSetupHint(): string {
  const id = providerId();
  return id ? `Set ${PROVIDERS[id].keyVar} in .env.local.` : `Set AI_PROVIDER and one of ${keyVars()} in .env.local.`;
}

/** Short label for the UI, e.g. "Claude", "OpenAI", "Llama". */
export function llmInfo(): { id: ProviderId | null; label: string } {
  const id = providerId();
  return { id, label: id ? PROVIDERS[id].provider.label : "AI" };
}

export function chatStream(opts: { messages: ChatMessage[]; tools?: ToolDef[] }): AsyncGenerator<StreamEvent> {
  return provider().chatStream(opts);
}

/** Extract the first balanced {...} block from free text. */
export function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Ask the model for JSON matching a Zod schema. Tries the provider's modes best first
 * (native JSON schema output, then a forced tool call where supported, then plain prompting).
 * Validates with Zod and retries up to twice, feeding the validation error back.
 */
export async function extractStructured<T extends z.ZodTypeAny>(opts: {
  schema: T;
  name: string;
  system: string;
  user: string;
}): Promise<z.infer<T>> {
  const p = provider();
  const jsonSchema = zodToJsonSchema(opts.schema, { $refStrategy: "none", target: "openApi3" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  const modes = p.structuredModes;
  let modeIdx = 0;
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${opts.system}\nRespond with a single JSON object only, no prose. It must match this JSON Schema:\n${JSON.stringify(jsonSchema)}`,
    },
    { role: "user", content: opts.user },
  ];
  let lastError = "unknown error";

  for (let attempt = 0; attempt < 3; attempt++) {
    let raw = "";
    try {
      raw = await p.completeJson({ messages, mode: modes[modeIdx], name: opts.name, schema: jsonSchema });
    } catch (e) {
      if (e instanceof LlmNotConfiguredError) throw e;
      const status = (e as { status?: number }).status;
      lastError = e instanceof Error ? e.message : String(e);
      // Mode not supported for this schema or model -> next mode, without burning a validation retry.
      if ((status === 400 || status === 404 || status === 422) && modeIdx < modes.length - 1) {
        modeIdx++;
        attempt--;
        continue;
      }
      if (attempt === 2) throw e;
      continue;
    }

    const block = extractJsonBlock(raw);
    try {
      if (!block) throw new Error("No JSON object found in the response");
      return opts.schema.parse(JSON.parse(block));
    } catch (e) {
      lastError = e instanceof z.ZodError ? JSON.stringify(e.issues.slice(0, 5)) : String(e);
      messages.push({ role: "assistant", content: raw || "(empty)" });
      messages.push({ role: "user", content: `Your JSON was invalid: ${lastError}. Return a corrected JSON object only.` });
    }
  }
  throw new Error(`Structured extraction failed after retries: ${lastError}`);
}
