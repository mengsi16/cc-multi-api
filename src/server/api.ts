import { Hono } from "hono";
import { loadConfig, saveConfig } from "./config.js";
import type { Config } from "./config.js";
import { Logger } from "./logger.js";

export { Logger };

export function findProviderRequiringRealKey(current: Config, next: Config) {
  const currentProviders = new Map(current.providers.map((provider) => [provider.name, provider]));

  for (const provider of next.providers) {
    if (!provider.apiKey.includes("*")) continue;

    const existing = currentProviders.get(provider.name);
    if (!existing) {
      return provider;
    }

    const unchanged =
      existing.protocol === provider.protocol &&
      existing.baseUrl === provider.baseUrl &&
      existing.apiKey === provider.apiKey;

    if (!unchanged) {
      return provider;
    }
  }

  return null;
}

export function createApiApp(logger: Logger): Hono {
  const app = new Hono();

  // GET /api/status
  app.get("/api/status", (c) => {
    return c.json({
      running: true,
      port: 3456,
      requestCount: logger.getStats().total,
      startTime: new Date().toISOString(),
    });
  });

  // GET /api/config
  app.get("/api/config", (c) => {
    return c.json(loadConfig());
  });

  // PUT /api/config — save and reload
  app.put("/api/config", async (c) => {
    let body: Partial<Config>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const current = loadConfig();
    const merged: Config = {
      port: typeof body.port === "number" ? body.port : current.port,
      providers: Array.isArray(body.providers) ? body.providers : current.providers,
      routes: typeof body.routes === "object" ? body.routes : current.routes,
    };

    const maskedProvider = findProviderRequiringRealKey(current, merged);
    if (maskedProvider) {
      return c.json(
        {
          error: `Provider "${maskedProvider.name}" has a masked apiKey. Please paste the real key before saving.`,
        },
        400
      );
    }

    saveConfig(merged);
    return c.json({ success: true });
  });

  // GET /api/logs — buffered logs (newest first)
  app.get("/api/logs", (c) => {
    return c.json(logger.getLogs());
  });

  // GET /api/logs/stream — SSE real-time log stream
  app.get("/api/logs/stream", (c) => {
    const encoder = new TextEncoder();
    let unsub: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send existing logs as snapshot
        const existing = logger.getLogs();
        for (const entry of existing) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        }

        // Subscribe to new logs
        unsub = logger.subscribe((entry) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
          } catch {
            // Stream closed — unsubscribe
            if (unsub) unsub();
          }
        });

        // Heartbeat every 30s to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(heartbeat);
            if (unsub) unsub();
          }
        }, 30000);
      },
      cancel() {
        if (unsub) unsub();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  });

  // POST /api/test/:providerName — connectivity test
  app.post("/api/test/:providerName", async (c) => {
    const name = c.req.param("providerName");
    const config = loadConfig();
    const provider = config.providers.find(p => p.name === name);

    if (!provider) {
      return c.json({ success: false, error: `Provider "${name}" not found` }, 404);
    }

    const start = Date.now();
    try {
      let upstreamResp: Response;

      if (provider.protocol === "anthropic") {
        upstreamResp = await fetch(`${provider.baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": provider.apiKey,
            "authorization": `Bearer ${provider.apiKey}`,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: provider.name, // any model name for testing
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
        });
      } else {
        upstreamResp = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.name,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
        });
      }

      const latency = Date.now() - start;
      const ok = upstreamResp.ok;

      if (ok) {
        return c.json({ success: true, latency, status: upstreamResp.status });
      } else {
        const errText = await upstreamResp.text().catch(() => "unknown error");
        return c.json({ success: false, latency, status: upstreamResp.status, error: errText.substring(0, 200) });
      }
    } catch (e: any) {
      const latency = Date.now() - start;
      return c.json({ success: false, latency, error: e?.message ?? "Connection failed" });
    }
  });

  return app;
}
