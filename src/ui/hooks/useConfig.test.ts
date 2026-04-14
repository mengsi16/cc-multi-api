import { describe, expect, test } from "bun:test";
import { extractConfigErrorMessage } from "./useConfig";

describe("extractConfigErrorMessage", () => {
  test("returns backend error message when response body contains error", async () => {
    const response = new Response(
      JSON.stringify({
        error: 'Provider "minimax" has a masked apiKey. Please paste the real key before saving.',
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );

    expect(await extractConfigErrorMessage(response)).toBe(
      'Provider "minimax" has a masked apiKey. Please paste the real key before saving.'
    );
  });

  test("falls back to HTTP status when body has no readable error", async () => {
    const response = new Response("bad request", { status: 400 });

    expect(await extractConfigErrorMessage(response)).toBe("HTTP 400");
  });
});
