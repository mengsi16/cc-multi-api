// ── OpenAI Translation Adapter ────────────────────────────────────────────────
// Translates Anthropic request/response ↔ OpenAI request/response

import { ulid } from "./ulid.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnthropicMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; [key: string]: any }>;
}

interface AnthropicBody {
  model?: string;
  max_tokens?: number;
  stream?: boolean;
  system?: string;
  messages?: AnthropicMessage[];
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  thinking?: any;
  [key: string]: any;
}

interface OpenAIMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message?: OpenAIMessage;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ── Request Translation ───────────────────────────────────────────────────────

export function translateRequestToOpenAI(body: AnthropicBody, targetModel: string): object {
  const messages: OpenAIMessage[] = [];

  // system prompt → messages[0] with role=system
  if (body.system) {
    messages.push({ role: "system", content: body.system });
  }

  // translate messages
  for (const msg of body.messages ?? []) {
    if (typeof msg.content === "string") {
      messages.push({ role: msg.role as any, content: msg.content });
    } else {
      // Multi-modal content blocks
      const textParts = (msg.content as any[])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      messages.push({ role: msg.role as any, content: textParts || null });
    }
  }

  const result: any = {
    model: targetModel,
    messages,
  };

  if (body.max_tokens !== undefined) result.max_tokens = body.max_tokens;
  if (body.stream !== undefined) result.stream = body.stream;
  if (body.temperature !== undefined) result.temperature = body.temperature;
  if (body.top_p !== undefined) result.top_p = body.top_p;
  if (body.stop_sequences !== undefined) result.stop = body.stop_sequences;
  if (body.tools !== undefined) {
    result.tools = body.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }
  if (body.tool_choice !== undefined) {
    // Anthropic tool_choice → OpenAI tool_choice
    if (body.tool_choice.type === "any" || body.tool_choice.type === "auto") {
      result.tool_choice = { type: body.tool_choice.type };
    } else if (body.tool_choice.type === "tool") {
      result.tool_choice = {
        type: "function",
        function: { name: body.tool_choice.name },
      };
    }
  }

  // Note: thinking is intentionally dropped (OpenAI has no equivalent)

  return result;
}

// ── Response Translation ─────────────────────────────────────────────────────

export function translateResponseToAnthropic(
  response: OpenAIResponse,
  originalModel?: string
): any {
  const choice = response.choices?.[0];
  const content: any[] = [];
  let stop_reason: string | null = null;

  if (choice?.message?.content) {
    content.push({ type: "text", text: choice.message.content });
  }

  if (choice?.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let args = tc.function.arguments;
      // Ensure arguments is a valid JSON string
      try {
        JSON.parse(args);
      } catch {
        args = "{}";
      }
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(args),
      });
    }
  }

  switch (choice?.finish_reason) {
    case "stop":
    case "length":
      stop_reason = "end_turn";
      break;
    case "tool_calls":
      stop_reason = "tool_use";
      break;
    default:
      stop_reason = choice?.finish_reason ?? null;
  }

  return {
    id: `msg_${ulid()}`,
    type: "message",
    role: "assistant",
    model: originalModel ?? response.model,
    content,
    stop_reason,
    stop_sequence: null,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

// ── SSE Stream Translation ────────────────────────────────────────────────────

function parseOpenAISSELine(rawLine: string): object | null {
  // SSE messages are separated by \n\n. After split by \n, lines may be:
  // - "data: {...}"      ← actual event line
  // - ""                  ← empty line between events (skip)
  const line = rawLine.trim();
  if (!line) return null;
  if (!line.startsWith("data: ")) return null;
  const json = line.slice(6).trim();
  if (json === "[DONE]") return { done: true };
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function* translateStreamToAnthropic(
  openAISTream: AsyncIterable<string>,
  originalModel: string
): AsyncIterable<string> {
  const msgId = `msg_${ulid()}`;
  let blockIndex = 0;
  let inTextBlock = false;
  let toolCallBuffer: Record<number, { name?: string; arguments?: string }> = {};
  let currentToolCallIndex = -1;

  // Emit message_start
  yield JSON.stringify({
    type: "message_start",
    message: {
      id: msgId,
      type: "message",
      role: "assistant",
      content: [],
      model: originalModel,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  });

  for await (const chunk of openAISTream) {
    // Split by \n\n to separate SSE events within this chunk
    // (each event is: "data: JSON\n\n" or "data: [DONE]\n\n")
    const messages = chunk.split("\n\n");
    for (const rawLine of messages) {
      const event = parseOpenAISSELine(rawLine);
      // [DONE] signals end-of-stream — still need to close open blocks
      if (!event) continue;
      if ((event as any).done) {
        // Close any open text block
        if (inTextBlock) {
          yield JSON.stringify({ type: "content_block_stop", index: blockIndex - 1 });
          inTextBlock = false;
        }
        if (currentToolCallIndex >= 0) {
          yield JSON.stringify({ type: "content_block_stop", index: blockIndex - 1 });
          currentToolCallIndex = -1;
        }
        yield JSON.stringify({
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 0 },
        });
        yield JSON.stringify({ type: "message_stop" });
        continue;
      }

      const data = event as any;
      const delta = data.choices?.[0]?.delta;
      const finish_reason = data.choices?.[0]?.finish_reason;

      // Text content delta
      if (delta?.content !== undefined && delta.content !== null && delta.content !== "") {
        if (!inTextBlock) {
          inTextBlock = true;
          yield JSON.stringify({
            type: "content_block_start",
            index: blockIndex,
            content_block: { type: "text", text: "" },
          });
          blockIndex++;
        }
        yield JSON.stringify({
          type: "content_block_delta",
          index: blockIndex - 1,
          delta: { type: "text_delta", text: delta.content },
        });
      }

      // Tool call delta
      if (delta?.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index ?? 0;
          if (currentToolCallIndex !== idx) {
            // New tool call block — name is in function.name per OpenAI SSE format
            const toolName = tcDelta.function?.name;
            toolCallBuffer[idx] = { name: toolName, arguments: tcDelta.function?.arguments };
            currentToolCallIndex = idx;

            yield JSON.stringify({
              type: "content_block_start",
              index: blockIndex,
              content_block: {
                type: "tool_use",
                id: tcDelta.id ?? `toolu_${ulid()}`,
                name: toolName ?? "",
                input: {},
              },
            });
            blockIndex++;

            // If args are present in same chunk, emit them now
            if (tcDelta.function?.arguments) {
              yield JSON.stringify({
                type: "content_block_delta",
                index: blockIndex - 1,
                delta: { type: "input_json_delta", partial_json: tcDelta.function.arguments },
              });
            }
          } else {
            // Accumulate arguments for current tool call
            if (tcDelta.function?.arguments) {
              toolCallBuffer[idx].arguments = (toolCallBuffer[idx].arguments ?? "") + tcDelta.function.arguments;
            }
            // Emit partial input delta
            const partialArgs = toolCallBuffer[idx].arguments ?? "";
            yield JSON.stringify({
              type: "content_block_delta",
              index: blockIndex - 1,
              delta: {
                type: "input_json_delta",
                partial_json: partialArgs.slice(Math.max(0, partialArgs.length - 100)),
              },
            });
          }
        }
      }

      // Stream finished
      if (finish_reason && finish_reason !== null) {
        // Close any open text block
        if (inTextBlock) {
          yield JSON.stringify({ type: "content_block_stop", index: blockIndex - 1 });
          inTextBlock = false;
        }

        // Close any open tool blocks
        if (currentToolCallIndex >= 0) {
          yield JSON.stringify({ type: "content_block_stop", index: blockIndex - 1 });
          currentToolCallIndex = -1;
        }

        const anthropicStopReason =
          finish_reason === "stop" || finish_reason === "length"
            ? "end_turn"
            : finish_reason === "tool_calls"
            ? "tool_use"
            : finish_reason;

        yield JSON.stringify({
          type: "message_delta",
          delta: { stop_reason: anthropicStopReason, stop_sequence: null },
          usage: { output_tokens: 0 },
        });
        yield JSON.stringify({ type: "message_stop" });
      }
    }
  }
}

// ── forwardOpenAIRequest (combines translation + fetch) ─────────────────────

export async function forwardOpenAIRequest(
  body: AnthropicBody,
  provider: { baseUrl: string; apiKey: string },
  targetModel: string,
  fetchFn: typeof fetch
): Promise<Response> {
  const openAIReq = translateRequestToOpenAI(body, targetModel);
  const isStream = body.stream === true;

  const resp = await fetchFn(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({ ...openAIReq, stream: isStream }),
  });

  return resp;
}
