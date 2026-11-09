import { afterEach, describe, expect, it } from "vitest";
import { llmConfigured, llmInfo, providerId, type ChatMessage } from "@/lib/llm";
import { toAnthropic } from "@/lib/llm-anthropic";
import { toOpenAi } from "@/lib/llm-openai";

const KEYS = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "LLAMA_API_KEY"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
function env(vars: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
}
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("provider selection", () => {
  it("is off without any key", () => {
    env({});
    expect(providerId()).toBeNull();
    expect(llmConfigured()).toBe(false);
  });

  it("picks the first key that is set: anthropic, openai, llama", () => {
    env({ LLAMA_API_KEY: "x", OPENAI_API_KEY: "y" });
    expect(providerId()).toBe("openai");
    env({ LLAMA_API_KEY: "x" });
    expect(llmInfo().label).toBe("Llama");
  });

  it("honors AI_PROVIDER and needs that provider's key", () => {
    env({ AI_PROVIDER: "Anthropic", OPENAI_API_KEY: "y" });
    expect(providerId()).toBe("anthropic");
    expect(llmConfigured()).toBe(false);
    env({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" });
    expect(llmConfigured()).toBe(true);
    expect(llmInfo().label).toBe("Claude");
  });

  it("rejects an unknown AI_PROVIDER", () => {
    env({ AI_PROVIDER: "gemini" });
    expect(() => providerId()).toThrow(/AI_PROVIDER/);
  });
});

const turn: ChatMessage[] = [
  { role: "system", content: "You sell tees." },
  { role: "user", content: "black tee" },
  {
    role: "assistant",
    content: "",
    toolCalls: [
      { id: "a", name: "search_products", arguments: '{"query":"black tee"}' },
      { id: "b", name: "get_store_info", arguments: "" },
    ],
  },
  { role: "tool", toolCallId: "a", name: "search_products", content: "1 result" },
  { role: "tool", toolCallId: "b", name: "get_store_info", content: "Lumen" },
];

describe("message conversion", () => {
  it("Anthropic: system apart, tool calls as tool_use, results grouped in one user turn", () => {
    const { system, messages } = toAnthropic(turn);
    expect(system).toBe("You sell tees.");
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[1].content).toEqual([
      { type: "tool_use", id: "a", name: "search_products", input: { query: "black tee" } },
      { type: "tool_use", id: "b", name: "get_store_info", input: {} },
    ]);
    expect(messages[2].content).toEqual([
      { type: "tool_result", tool_use_id: "a", content: "1 result" },
      { type: "tool_result", tool_use_id: "b", content: "Lumen" },
    ]);
  });

  it("Anthropic: replays native assistant content unchanged", () => {
    const native = [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text: "Hi" }];
    const { messages } = toAnthropic([{ role: "user", content: "hi" }, { role: "assistant", content: "Hi", native }]);
    expect(messages[1].content).toBe(native);
  });

  it("OpenAI: tool calls and tool messages keep their ids", () => {
    const out = toOpenAi(turn);
    expect(out.map((m) => m.role)).toEqual(["system", "user", "assistant", "tool", "tool"]);
    expect(out[2]).toMatchObject({ content: null, tool_calls: [{ id: "a", function: { name: "search_products" } }, { id: "b" }] });
    expect(out[3]).toEqual({ role: "tool", tool_call_id: "a", content: "1 result" });
  });
});
