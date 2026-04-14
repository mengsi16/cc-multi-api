import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { Logger } from "./logger.js";

// Phase 1 proxy only exposes PROXY_ERROR_RESPONSE and createProxyApp.
// Handler forwarding logic is tested via smoke check in Phase 1.
// Phase 2 tests the full handler with router integration.

describe("PROXY_ERROR_RESPONSE", async () => {
  const { PROXY_ERROR_RESPONSE } = await import("./proxy.js");

  async function parseBody(resp: Response) {
    return JSON.parse(await resp.text());
  }

  test("returns Anthropic error format with not_found_error for 404", async () => {
    const resp = PROXY_ERROR_RESPONSE("Model not found", 404);
    expect(resp.status).toBe(404);
    const body = await parseBody(resp);
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("not_found_error");
    expect(body.error.message).toBe("Model not found");
  });

  test("returns Anthropic error format with authentication_error for 401", async () => {
    const resp = PROXY_ERROR_RESPONSE("Invalid key", 401);
    const body = await parseBody(resp);
    expect(body.error.type).toBe("authentication_error");
  });

  test("returns api_error for other status codes", async () => {
    const resp = PROXY_ERROR_RESPONSE("Server error", 502);
    const body = await parseBody(resp);
    expect(body.error.type).toBe("api_error");
    expect(resp.status).toBe(502);
  });

  test("returns invalid_request_error for 400", async () => {
    const resp = PROXY_ERROR_RESPONSE("Bad request", 400);
    const body = await parseBody(resp);
    expect(body.error.type).toBe("invalid_request_error");
  });

  test("has content-type: application/json header", () => {
    const resp = PROXY_ERROR_RESPONSE("test", 500);
    expect(resp.headers.get("content-type")).toContain("application/json");
  });
});

describe("createProxyApp", async () => {
  const { createProxyApp } = await import("./proxy.js");

  test("returns a Hono app with a fetch method", () => {
    const app = createProxyApp((() => {}) as unknown as typeof fetch);
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });
});

describe("createProxyHandler", async () => {
  const { createProxyHandler } = await import("./proxy.js");

  test("reloads config for each request so updated provider key is used immediately", async () => {
    let currentConfig = {
      port: 3456,
      providers: [
        { name: "minimax", protocol: "anthropic", baseUrl: "https://api.minimaxi.com/anthropic", apiKey: "sk-old" },
      ],
      routes: {
        default: { provider: "minimax", model: "MiniMax-M2.5" },
      },
    };

    const capturedAuthHeaders: string[] = [];
    const mockFetch = (_url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      capturedAuthHeaders.push(headers.get("authorization") ?? "");
      return Promise.resolve(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    };

    const logger = new Logger();
    const app = new Hono();
    app.post(
      "/v1/messages",
      createProxyHandler(mockFetch as any, () => currentConfig as any, logger)
    );

    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    };

    await app.fetch(
      new Request("http://localhost/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

    currentConfig = {
      ...currentConfig,
      providers: [
        { name: "minimax", protocol: "anthropic", baseUrl: "https://api.minimaxi.com/anthropic", apiKey: "sk-new" },
      ],
    };

    await app.fetch(
      new Request("http://localhost/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

    expect(capturedAuthHeaders).toEqual(["Bearer sk-old", "Bearer sk-new"]);
  });

  test("strips stale compression headers from anthropic upstream responses", async () => {
    const config = {
      port: 3456,
      providers: [
        { name: "minimax", protocol: "anthropic", baseUrl: "https://api.minimaxi.com/anthropic", apiKey: "sk-test" },
      ],
      routes: {
        default: { provider: "minimax", model: "MiniMax-M2.5" },
      },
    };

    const upstreamBody = 'event: message_start\n\ndata: {"type":"message_start"}\n\n';
    const mockFetch = () =>
      Promise.resolve(
        new Response(upstreamBody, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "content-encoding": "br",
            "content-length": "999",
            "transfer-encoding": "chunked",
            "trace-id": "abc123",
          },
        })
      );

    const logger = new Logger();
    const app = new Hono();
    app.post("/v1/messages", createProxyHandler(mockFetch as any, config as any, logger));

    const response = await app.fetch(
      new Request("http://localhost/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 16,
          messages: [{ role: "user", content: "hi" }],
          stream: true,
        }),
      })
    );

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("trace-id")).toBe("abc123");
    expect(await response.text()).toBe(upstreamBody);
  });
});
