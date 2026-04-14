import { describe, expect, test } from "bun:test";
import { serializeRawCapture, shouldStopAfterCapture } from "./claude-base-url-raw-capture";

describe("serializeRawCapture", () => {
  test("preserves raw request line, header order and body text", () => {
    const output = serializeRawCapture({
      method: "POST",
      url: "/v1/messages?foo=1",
      rawHeaders: [
        "Authorization",
        "Bearer sk-real-secret",
        "x-api-key",
        "sk-real-secret",
        "Content-Type",
        "application/json",
      ],
      body: '{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}',
    });

    expect(output).toContain("POST /v1/messages?foo=1");
    expect(output).toContain("Authorization: Bearer sk-real-secret");
    expect(output).toContain("x-api-key: sk-real-secret");
    expect(output).toContain('{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}');
    expect(output).not.toContain('\n  "model"');
  });

  test("oneshot waits for the first non-head request", () => {
    expect(shouldStopAfterCapture(false, "HEAD")).toBe(false);
    expect(shouldStopAfterCapture(true, "HEAD")).toBe(false);
    expect(shouldStopAfterCapture(true, "POST")).toBe(true);
  });
});
