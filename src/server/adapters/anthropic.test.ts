import { describe, test, expect, beforeEach } from "bun:test";
import type { Provider } from "../config.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const deepseekProvider: Provider = {
  name: "deepseek",
  protocol: "anthropic",
  baseUrl: "https://api.deepseek.com",
  apiKey: "sk-deepseek-abc123",
};

const minimaxProvider: Provider = {
  name: "minimax",
  protocol: "anthropic",
  baseUrl: "https://api.minimaxi.com/anthropic",
  apiKey: "sk-minimax-xyz",
};

const mockAnthropicBody = {
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello" },
  ],
  stream: true,
  system: "You are a helpful assistant.",
};

// ── RED: Failing tests ────────────────────────────────────────────────────────

describe("forwardAnthropicRequest", async () => {
  const { forwardAnthropicRequest } = await import("./anthropic.js");

  test("builds correct URL from provider baseUrl + /v1/messages", async () => {
    let capturedUrl = "";
    const mockFetch = (url: string, _init: RequestInit) => {
      capturedUrl = url;
      return Promise.resolve(new Response("{}", { status: 200 }));
    };

    await forwardAnthropicRequest(mockAnthropicBody, deepseekProvider, "deepseek-chat", mockFetch as any);

    expect(capturedUrl).toBe("https://api.deepseek.com/v1/messages");
  });

  test("sets x-api-key header from provider.apiKey", async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(
        (init.headers instanceof Headers)
          ? Array.from((init.headers as Headers).entries())
          : Object.entries((init.headers as Record<string, string>) ?? {})
      );
      return Promise.resolve(new Response("{}", { status: 200 }));
    };

    await forwardAnthropicRequest(mockAnthropicBody, deepseekProvider, "deepseek-chat", mockFetch as any);

    expect(capturedHeaders["x-api-key"]).toBe("sk-deepseek-abc123");
    expect(capturedHeaders["authorization"]).toBe("Bearer sk-deepseek-abc123");
    expect(capturedHeaders["anthropic-version"]).toBe("2023-06-01");
    expect(capturedHeaders["content-type"]).toContain("application/json");
  });

  test("replaces model field with targetModel", async () => {
    let capturedBody = "";
    const mockFetch = (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return Promise.resolve(new Response("{}", { status: 200 }));
    };

    await forwardAnthropicRequest(mockAnthropicBody, minimaxProvider, "minimax-text-01", mockFetch as any);

    const parsed = JSON.parse(capturedBody);
    expect(parsed.model).toBe("minimax-text-01");
  });

  test("preserves all other body fields unchanged", async () => {
    let capturedBody = "";
    const mockFetch = (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return Promise.resolve(new Response("{}", { status: 200 }));
    };

    await forwardAnthropicRequest(mockAnthropicBody, minimaxProvider, "minimax-text-01", mockFetch as any);

    const parsed = JSON.parse(capturedBody);
    expect(parsed.stream).toBe(true);
    expect(parsed.system).toBe("You are a helpful assistant.");
    expect(parsed.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(parsed.max_tokens).toBe(1024);
  });

  test("returns upstream Response with stream body", async () => {
    const mockStream = new ReadableStream();
    const mockFetch = () =>
      Promise.resolve(new Response(mockStream, { status: 200, headers: { "content-type": "text/event-stream" } }));

    const resp = await forwardAnthropicRequest(mockAnthropicBody, deepseekProvider, "deepseek-chat", mockFetch as any);
    expect(resp.headers.get("content-type")).toContain("text/event-stream");
  });

  test("forwards incoming anthropic headers but still uses provider auth", async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(
        (init.headers instanceof Headers)
          ? Array.from((init.headers as Headers).entries())
          : Object.entries((init.headers as Record<string, string>) ?? {})
      );
      return Promise.resolve(new Response("{}", { status: 200 }));
    };

    const incomingHeaders = new Headers({
      "anthropic-beta": "claude-code-20250219,context-management-2025-06-27",
      "anthropic-dangerous-direct-browser-access": "true",
      "anthropic-version": "2023-06-01",
      "authorization": "Bearer should-not-pass-through",
    });

    await forwardAnthropicRequest(
      mockAnthropicBody,
      deepseekProvider,
      "deepseek-chat",
      mockFetch as any,
      incomingHeaders
    );

    expect(capturedHeaders["anthropic-beta"]).toBe("claude-code-20250219,context-management-2025-06-27");
    expect(capturedHeaders["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(capturedHeaders["authorization"]).toBe("Bearer sk-deepseek-abc123");
    expect(capturedHeaders["x-api-key"]).toBe("sk-deepseek-abc123");
  });
});
