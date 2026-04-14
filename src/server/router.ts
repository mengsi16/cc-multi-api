import type { Config, Provider } from "./config.js";

export interface RouteResult {
  provider: Provider;
  targetModel: string;
}

export function resolveRoute(model: string, config: Config): RouteResult | null {
  // 1. Exact match
  const exact = config.routes[model];
  if (exact !== undefined && exact !== null) {
    const provider = config.providers.find(p => p.name === exact.provider);
    if (provider) return { provider, targetModel: exact.model };
  }

  // 2. Prefix match — longest matching prefix wins
  let bestMatch: { key: string; route: NonNullable<typeof exact> } | null = null;
  let bestKeyLen = 0;

  for (const [key, route] of Object.entries(config.routes)) {
    if (key === "default" || route === null) continue;
    if (model.startsWith(key) && key.length > bestKeyLen) {
      bestMatch = { key, route };
      bestKeyLen = key.length;
    }
  }

  if (bestMatch) {
    const provider = config.providers.find(p => p.name === bestMatch!.route.provider);
    if (provider) return { provider, targetModel: bestMatch!.route.model };
  }

  // 3. Default fallback
  const def = config.routes["default"];
  if (def !== undefined && def !== null) {
    const provider = config.providers.find(p => p.name === def.provider);
    if (provider) return { provider, targetModel: def.model };
  }

  return null;
}
