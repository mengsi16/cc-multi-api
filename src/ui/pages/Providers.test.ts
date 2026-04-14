import { describe, expect, test } from "bun:test";
import { getProviderFormState } from "./Providers";

describe("getProviderFormState", () => {
  test("clears masked apiKey when editing an existing provider", () => {
    const state = getProviderFormState({
      name: "minimax",
      protocol: "anthropic",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-c****iEAU",
    });

    expect(state.form.apiKey).toBe("");
    expect(state.requiresApiKeyReset).toBe(true);
  });

  test("keeps real apiKey when provider config contains an unmasked key", () => {
    const state = getProviderFormState({
      name: "minimax",
      protocol: "anthropic",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-real-key",
    });

    expect(state.form.apiKey).toBe("sk-real-key");
    expect(state.requiresApiKeyReset).toBe(false);
  });
});
