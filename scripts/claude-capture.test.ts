import { describe, expect, test } from "bun:test";
import { buildCaptureRecord } from "./claude-capture";

describe("buildCaptureRecord", () => {
  test("redacts sensitive auth headers and preserves request body", () => {
    const headers = new Headers({
      "authorization": "Bearer sk-test-secret",
      "x-api-key": "sk-test-secret",
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    });

    const request = new Request("http://127.0.0.1:4567/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    const record = buildCaptureRecord(
      request,
      {
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "hi" }],
      },
      "127.0.0.1"
    );

    expect(record.path).toBe("/v1/messages");
    expect(record.headers.authorization).toBe("Bearer sk-t...cret");
    expect(record.headers["x-api-key"]).toBe("sk-t...cret");
    expect(record.body.messages[0].content).toBe("hi");
  });
});
