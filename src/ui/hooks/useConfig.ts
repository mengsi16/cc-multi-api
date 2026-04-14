import { useState, useEffect, useCallback } from "react";

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

export async function extractConfigErrorMessage(resp: Response): Promise<string> {
  try {
    const data = await resp.json() as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Ignore malformed bodies and use the generic HTTP fallback.
  }

  return `HTTP ${resp.status}`;
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch("/api/config");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setConfig(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = useCallback(async (partial: Partial<Config>) => {
    if (!config) return;
    const merged: Config = {
      port: partial.port ?? config.port,
      providers: partial.providers ?? config.providers,
      routes: partial.routes ?? config.routes,
    };
    const resp = await fetch("/api/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(merged),
    });
    if (!resp.ok) throw new Error(await extractConfigErrorMessage(resp));
    await fetchConfig();
  }, [config, fetchConfig]);

  return { config, loading, error, updateConfig, refetch: fetchConfig };
}
