import { describe, test, expect } from "bun:test";
import type { Config } from "./config.js";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const minimalConfig: Config = {
  port: 3456,
  providers: [
    {
      name: "openai",
      protocol: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-openai-test",
    },
    {
      name: "deepseek",
      protocol: "anthropic",
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-deepseek-test",
    },
    {
      name: "minimax",
      protocol: "anthropic",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-minimax-test",
    },
  ],
  routes: {
    "claude-opus-4-6": { provider: "openai", model: "gpt-4o" },
    "claude-sonnet-4-5": { provider: "minimax", model: "minimax-text-01" },
    "default": { provider: "deepseek", model: "deepseek-chat" },
  },
};

// ── RED: Write failing tests first ───────────────────────────────────────────

describe("resolveRoute", async () => {
  const { resolveRoute } = await import("./router.js");

  test("exact match returns correct provider and model", () => {
    const result = resolveRoute("claude-opus-4-6", minimalConfig);
    expect(result).not.toBeNull();
    expect(result!.provider.name).toBe("openai");
    expect(result!.provider.apiKey).toBe("sk-openai-test");
    expect(result!.targetModel).toBe("gpt-4o");
  });

  test("exact match for minimax route", () => {
    const result = resolveRoute("claude-sonnet-4-5", minimalConfig);
    expect(result).not.toBeNull();
    expect(result!.provider.name).toBe("minimax");
    expect(result!.targetModel).toBe("minimax-text-01");
  });

  test("falls back to default when model not found", () => {
    const result = resolveRoute("unknown-model-xyz", minimalConfig);
    expect(result).not.toBeNull();
    expect(result!.provider.name).toBe("deepseek");
    expect(result!.targetModel).toBe("deepseek-chat");
  });

  test("prefix match: model with date suffix matches base model", () => {
    const result = resolveRoute("claude-sonnet-4-5-20251101", minimalConfig);
    expect(result).not.toBeNull();
    expect(result!.provider.name).toBe("minimax");
    expect(result!.targetModel).toBe("minimax-text-01");
  });

  test("prefix match prefers longest matching prefix", () => {
    const cfg: Config = {
      ...minimalConfig,
      routes: {
        "claude-sonnet": { provider: "openai", model: "gpt-4o-mini" },
        "claude-sonnet-4": { provider: "deepseek", model: "deepseek-chat" },
        "default": { provider: "openai", model: "gpt-4o" },
      },
    };
    // "claude-sonnet-4-5" should match "claude-sonnet-4" (not "claude-sonnet")
    const result = resolveRoute("claude-sonnet-4-5", cfg);
    expect(result!.targetModel).toBe("deepseek-chat");
  });

  test("returns null when no route exists and no default", () => {
    const cfg: Config = { port: 3456, providers: [], routes: {} };
    const result = resolveRoute("any-model", cfg);
    expect(result).toBeNull();
  });

  test("references non-existent provider returns null", () => {
    const cfg: Config = {
      ...minimalConfig,
      routes: { "claude-opus-4-6": { provider: "nonexistent", model: "x" } },
    };
    const result = resolveRoute("claude-opus-4-6", cfg);
    expect(result).toBeNull();
  });
});
