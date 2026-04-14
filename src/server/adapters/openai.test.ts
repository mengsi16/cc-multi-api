import { describe, test, expect } from "bun:test";

// ── Test data ─────────────────────────────────────────────────────────────────

const minimalAnthropicBody = {
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello" },
  ],
};

const anthropicBodyWithSystem = {
  model: "claude-sonnet-4-5",
  max_tokens: 512,
  messages: [
    { role: "user", content: "Hi" },
  ],
  system: "You are a pirate.",
};

const anthropicBodyWithTools = {
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "What's the weather?" },
  ],
  tools: [
    {
      name: "get_weather",
      description: "Get weather for a location",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    },
  ],
};

const anthropicBodyWithThinking = {
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  thinking: { type: "enabled", budget_tokens: 16000 },
  messages: [{ role: "user", content: "Calculate 2+2" }],
};

const openaiResponse = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "gpt-4o",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "Hello! How can I help?",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 9,
    total_tokens: 19,
  },
};

const openaiResponseWithTools = {
  ...openaiResponse,
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_abc",
            type: "function",
            function: { name: "get_weather", arguments: '{"location":"Tokyo"}' },
          },
        ],
      },
      finish_reason: "tool_calls",
    },
  ],
};

// Each item in the async generator is a complete SSE message string (may contain embedded \n)
const openaiSSEChunk = (content: string) =>
  `data: ${JSON.stringify({
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4o",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  })}\n\n`;

const openaiSSEToolChunk = (name: string, partialArgs: string) =>
  `data: ${JSON.stringify({
    id: "chatcmpl-123",
    choices: [{
      index: 0,
      delta: { tool_calls: [{ index: 0, id: "call_abc", type: "function", function: { name, arguments: partialArgs } }] },
      finish_reason: null,
    }],
  })}\n\n`;

const openaiSSEDone = "data: [DONE]\n\n";

// ── RED: Request Translation Tests ─────────────────────────────────────────────

describe("translateRequestToOpenAI", async () => {
  const { translateRequestToOpenAI } = await import("./openai.js");

  test("maps model to target model", () => {
    const result = translateRequestToOpenAI(minimalAnthropicBody, "gpt-4o-mini");
    expect(result.model).toBe("gpt-4o-mini");
  });

  test("maps max_tokens directly", () => {
    const result = translateRequestToOpenAI(minimalAnthropicBody, "gpt-4o-mini");
    expect(result.max_tokens).toBe(1024);
  });

  test("maps simple messages array", () => {
    const result = translateRequestToOpenAI(minimalAnthropicBody, "gpt-4o");
    expect(result.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  test("converts system string to messages[0] with role=system", () => {
    const result = translateRequestToOpenAI(anthropicBodyWithSystem, "gpt-4o");
    expect(result.messages[0]).toEqual({ role: "system", content: "You are a pirate." });
    expect(result.messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  test("converts Anthropic tools to OpenAI tools format", () => {
    const result = translateRequestToOpenAI(anthropicBodyWithTools, "gpt-4o");
    expect(result.tools).toBeDefined();
    expect(result.tools[0].type).toBe("function");
    expect(result.tools[0].function).toEqual({
      name: "get_weather",
      description: "Get weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    });
  });

  test("drops thinking field (not supported by OpenAI)", () => {
    const result = translateRequestToOpenAI(anthropicBodyWithThinking, "gpt-4o");
    expect(result.thinking).toBeUndefined();
  });

  test("maps temperature, top_p, stop_sequences", () => {
    const body = {
      model: "test",
      max_tokens: 100,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["END"],
      messages: [],
    };
    const result = translateRequestToOpenAI(body, "gpt-4o");
    expect(result.temperature).toBe(0.7);
    expect(result.top_p).toBe(0.9);
    expect(result.stop).toEqual(["END"]);
  });

  test("handles stream: true", () => {
    const body = { ...minimalAnthropicBody, stream: true };
    const result = translateRequestToOpenAI(body, "gpt-4o");
    expect(result.stream).toBe(true);
  });
});

// ── RED: Response Translation Tests ───────────────────────────────────────────

describe("translateResponseToAnthropic", async () => {
  const { translateResponseToAnthropic } = await import("./openai.js");

  test("maps OpenAI content to Anthropic text block", () => {
    const result = translateResponseToAnthropic(openaiResponse);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({ type: "text", text: "Hello! How can I help?" });
  });

  test("maps usage fields correctly", () => {
    const result = translateResponseToAnthropic(openaiResponse);
    expect(result.usage.input_tokens).toBe(10);
    expect(result.usage.output_tokens).toBe(9);
  });

  test("maps finish_reason stop to stop_reason end_turn", () => {
    const result = translateResponseToAnthropic(openaiResponse);
    expect(result.stop_reason).toBe("end_turn");
  });

  test("maps tool_calls to Anthropic tool_use blocks", () => {
    const result = translateResponseToAnthropic(openaiResponseWithTools);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("tool_use");
    expect(result.content[0].name).toBe("get_weather");
    expect(result.content[0].input).toEqual({ location: "Tokyo" });
    expect(result.stop_reason).toBe("tool_use");
  });

  test("maps finish_reason tool_calls to stop_reason tool_use", () => {
    const result = translateResponseToAnthropic(openaiResponseWithTools);
    expect(result.stop_reason).toBe("tool_use");
  });

  test("adds required Anthropic message fields", () => {
    const result = translateResponseToAnthropic(openaiResponse, "claude-sonnet-4-5");
    expect(result.type).toBe("message");
    expect(result.role).toBe("assistant");
    expect(result.id).toMatch(/^msg_/);
    expect(result.model).toBe("claude-sonnet-4-5");
  });
});

// ── RED: SSE Stream Translation Tests ────────────────────────────────────────

describe("translateStreamToAnthropic", async () => {
  const { translateStreamToAnthropic } = await import("./openai.js");

  async function* makeOpenAISSE(chunks: string[]): AsyncIterable<string> {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  test("generates message_start event with required fields", async () => {
    const openAISSE = makeOpenAISSE([
      openaiSSEChunk(""),
    ]);
    const events: string[] = [];
    for await (const event of translateStreamToAnthropic(openAISSE, "claude-sonnet-4-5")) {
      events.push(event);
    }
    const firstEvent = JSON.parse(events[0]);
    expect(firstEvent.type).toBe("message_start");
    expect(firstEvent.message.id).toMatch(/^msg_/);
    expect(firstEvent.message.role).toBe("assistant");
    expect(firstEvent.message.content).toEqual([]);
  });

  test("generates content_block_start + delta + stop for text", async () => {
    const openAISSE = makeOpenAISSE([
      openaiSSEChunk("Hello"),
      openaiSSEChunk(" world"),
      openaiSSEDone,
    ]);
    const events: string[] = [];
    for await (const event of translateStreamToAnthropic(openAISSE, "claude-sonnet-4-5")) {
      events.push(event);
    }

    const blockStart = events.find(e => JSON.parse(e).type === "content_block_start");
    expect(blockStart).toBeDefined();
    expect(JSON.parse(blockStart!).content_block.type).toBe("text");

    const deltas = events.filter(e => JSON.parse(e).type === "content_block_delta");
    expect(deltas[0]).toBeDefined();
    expect(JSON.parse(deltas[0]).delta.type).toBe("text_delta");
    expect(JSON.parse(deltas[0]).delta.text).toBe("Hello");
    expect(JSON.parse(deltas[1]).delta.text).toBe(" world");

    const blockStop = events.find(e => JSON.parse(e).type === "content_block_stop");
    expect(blockStop).toBeDefined();

    const msgDelta = events.find(e => JSON.parse(e).type === "message_delta");
    expect(msgDelta).toBeDefined();
    expect(JSON.parse(msgDelta!).delta.stop_reason).toBe("end_turn");

    const msgStop = events.find(e => JSON.parse(e).type === "message_stop");
    expect(msgStop).toBeDefined();
  });

  test("generates tool_use content block for tool_calls SSE", async () => {
    // Use \\n (literal backslash+n) in JSON strings, NOT real newline \n
    // Real SSE: arguments contain literal newline chars, but our parse by \n\n would break them
    // The function.name arrives in the first chunk
    const openAISSE = makeOpenAISSE([
      openaiSSEToolChunk("get_weather", '{"location":"'),
      openaiSSEToolChunk("get_weather", 'Tokyo"}'),
      openaiSSEDone,
    ]);
    const events: string[] = [];
    for await (const event of translateStreamToAnthropic(openAISSE, "claude-sonnet-4-5")) {
      events.push(event);
    }

    const blockStart = events.find(e => JSON.parse(e).type === "content_block_start");
    expect(blockStart).toBeDefined();
    expect(JSON.parse(blockStart!).content_block.type).toBe("tool_use");

    const toolBlockStart = JSON.parse(blockStart!).content_block;
    expect(toolBlockStart.name).toBe("get_weather");
    // OpenAI SSE uses id from the stream (e.g. "call_abc"), not toolu_ prefix
    expect(toolBlockStart.id).toMatch(/^(toolu_|call_)/);
  });
});
