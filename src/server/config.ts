import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface Provider {
  name: string;
  protocol: "anthropic" | "openai";
  baseUrl: string;
  apiKey: string;
}

export interface Route {
  provider: string;
  model: string;
}

export interface Config {
  port: number;
  providers: Provider[];
  routes: Record<string, Route | null>;
}

export function getDefaultConfig(): Config {
  return {
    port: 3456,
    providers: [],
    routes: {},
  };
}

function getDefaultConfigPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return `${home}/.cc-multi-api/config.json`;
}

function ensureConfigDir(configPath: string): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(configPath?: string): Config {
  const path = configPath ?? getDefaultConfigPath();

  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw) as Config;
      // Basic validation
      if (typeof parsed.port === "number" && Array.isArray(parsed.providers)) {
        return parsed;
      }
    } catch {
      // Malformed JSON or invalid shape — fall through to default
    }
  }

  // Create default config
  const defaultCfg = getDefaultConfig();
  ensureConfigDir(path);
  writeFileSync(path, JSON.stringify(defaultCfg, null, 2), "utf-8");
  return defaultCfg;
}

export function saveConfig(config: Config, configPath?: string): void {
  const path = configPath ?? getDefaultConfigPath();
  ensureConfigDir(dirname(path));
  writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return getDefaultConfigPath();
}
