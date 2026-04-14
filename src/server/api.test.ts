import { describe, expect, test } from "bun:test";
import type { Config } from "./config";
import { findProviderRequiringRealKey } from "./api";

const currentConfig: Config = {
  port: 3456,
  providers: [
    {
      name: "deepseek",
      protocol: "anthropic",
      baseUrl: "https://api.deepseek.com",
      apiKey: "PLAC****_KEY",
    },
    {
      name: "minimax",
      protocol: "anthropic",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-real-minimax",
    },
  ],
  routes: {
    default: {
      provider: "minimax",
      model: "MiniMax-M2.5",
    },
  },
};

describe("findProviderRequiringRealKey", () => {
  test("allows unchanged masked providers when saving another provider", () => {
    const nextConfig: Config = {
      ...currentConfig,
      providers: [
        currentConfig.providers[0],
        {
          ...currentConfig.providers[1],
          baseUrl: "https://api.minimaxi.com/v2/anthropic",
        },
      ],
    };

    expect(findProviderRequiringRealKey(currentConfig, nextConfig)).toBeNull();
  });

  test("rejects a new provider with a masked key", () => {
    const nextConfig: Config = {
      ...currentConfig,
      providers: [
        ...currentConfig.providers,
        {
          name: "kimi",
          protocol: "anthropic",
          baseUrl: "https://api.moonshot.cn/anthropic",
          apiKey: "sk-****",
        },
      ],
    };

    expect(findProviderRequiringRealKey(currentConfig, nextConfig)?.name).toBe("kimi");
  });

  test("rejects editing a masked provider without replacing the real key", () => {
    const nextConfig: Config = {
      ...currentConfig,
      providers: [
        {
          ...currentConfig.providers[0],
          baseUrl: "https://api.deepseek.com/anthropic",
        },
        currentConfig.providers[1],
      ],
    };

    expect(findProviderRequiringRealKey(currentConfig, nextConfig)?.name).toBe("deepseek");
  });
});
