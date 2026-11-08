/** Provider-neutral message and tool shapes shared by every LLM adapter. */

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
};

export type ToolCall = { id: string; name: string; arguments: string };

/**
 * `native` keeps the provider's own assistant content (e.g. Claude's thinking and
 * tool_use blocks) so it can be sent back unchanged on the next turn.
 */
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[]; native?: unknown }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "done"; content: string; toolCalls: ToolCall[]; native?: unknown };

/** How a provider is asked for JSON: native schema output, a forced tool call, or plain prompting. */
export type StructuredMode = "json_schema" | "tool" | "prompt";

export type ProviderId = "anthropic" | "openai" | "llama";

export interface Provider {
  id: ProviderId;
  label: string;
  model(): Promise<string>;
  /** Modes to try for structured output, best first. */
  structuredModes: StructuredMode[];
  chatStream(opts: { messages: ChatMessage[]; tools?: ToolDef[] }): AsyncGenerator<StreamEvent>;
  /** One completion that should contain JSON; returns the raw text (or tool arguments). */
  completeJson(opts: {
    messages: ChatMessage[];
    mode: StructuredMode;
    name: string;
    schema: Record<string, unknown>;
  }): Promise<string>;
}

export class LlmNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmNotConfiguredError";
  }
}

export function newCallId(): string {
  return `call_${Math.random().toString(36).slice(2, 10)}`;
}
