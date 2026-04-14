import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("config", () => {
  const testDir = join(tmpdir(), `cc-multi-api-test-${Date.now()}`);
  const testPath = join(testDir, "config.json");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { unlinkSync(testPath); } catch {}
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  test("getDefaultConfig returns correct shape", async () => {
    const { getDefaultConfig } = await import("./config.js");
    const cfg = getDefaultConfig();
    expect(cfg.port).toBe(3456);
    expect(Array.isArray(cfg.providers)).toBe(true);
    expect(typeof cfg.routes).toBe("object");
    expect(cfg.providers).toHaveLength(0);
  });

  test("loadConfig creates default config when file does not exist", async () => {
    const { loadConfig } = await import("./config.js");
    const cfg = loadConfig(testPath);
    expect(cfg.port).toBe(3456);
    expect(cfg.providers).toEqual([]);
    expect(cfg.routes).toEqual({});
    expect(existsSync(testPath)).toBe(true);
  });

  test("loadConfig reads existing config file", async () => {
    const { loadConfig, saveConfig } = await import("./config.js");
    const saved = {
      port: 9999,
      providers: [{ name: "test", protocol: "anthropic", baseUrl: "https://x.com", apiKey: "sk-abc" }],
      routes: { "claude-sonnet-4-5": { provider: "test", model: "my-model" } },
    };
    saveConfig(saved, testPath);
    const cfg = loadConfig(testPath);
    expect(cfg.port).toBe(9999);
    expect(cfg.providers).toHaveLength(1);
    expect(cfg.providers[0].name).toBe("test");
    expect(cfg.routes["claude-sonnet-4-5"]).toEqual({ provider: "test", model: "my-model" });
  });

  test("saveConfig writes valid JSON that can be reloaded", async () => {
    const { saveConfig, loadConfig } = await import("./config.js");
    const cfg = {
      port: 8888,
      providers: [],
      routes: { default: { provider: "openai", model: "gpt-4o" } },
    };
    saveConfig(cfg, testPath);
    const reloaded = loadConfig(testPath);
    expect(reloaded.port).toBe(8888);
  });

  test("loadConfig returns default when file is malformed JSON", async () => {
    const { loadConfig } = await import("./config.js");
    writeFileSync(testPath, "not json at all {{{", "utf-8");
    // Should not throw, should fall back to default
    const cfg = loadConfig(testPath);
    expect(cfg.port).toBe(3456);
  });
});
