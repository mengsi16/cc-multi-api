import { Hono, type Context } from "hono";
import { loadConfig } from "./config.js";
import type { Config } from "./config.js";
import { resolveRoute } from "./router.js";
import { forwardAnthropicRequest } from "./adapters/anthropic.js";
import { forwardOpenAIRequest } from "./adapters/openai.js";
import { Logger } from "./logger.js";

function sanitizeUpstreamHeaders(headers: Headers): Headers {
  const sanitized = new Headers(headers);
  sanitized.delete("content-encoding");
  sanitized.delete("content-length");
  sanitized.delete("transfer-encoding");
  sanitized.delete("connection");
  return sanitized;
}

export function PROXY_ERROR_RESPONSE(message: string, status = 500): Response {
  const type = status === 400
    ? "invalid_request_error"
    : status === 401
    ? "authentication_error"
    : status === 404
    ? "not_found_error"
    : "api_error";

  return new Response(
    JSON.stringify({
      type: "error",
      error: { type, message },
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    }
  );
}

export function createProxyHandler(
  fetchFn: typeof fetch,
  configOrLoader: Config | (() => Config),
  logger: Logger
): (c: Context) => Promise<Response> {
  return async (c: Context): Promise<Response> => {
    const start = Date.now();

    let body: object;
    try {
      body = await c.req.json();
    } catch {
      return PROXY_ERROR_RESPONSE("Invalid JSON body", 400);
    }

    const model = (body as any).model as string | undefined;
    if (!model) {
      return PROXY_ERROR_RESPONSE("Missing model field", 400);
    }

    const config = typeof configOrLoader === "function" ? configOrLoader() : configOrLoader;
    const route = resolveRoute(model, config);
    if (!route) {
      const elapsed = Date.now() - start;
      logger.log({ time: new Date().toISOString(), model, provider: "", targetModel: "", duration: elapsed, status: 404 });
      return PROXY_ERROR_RESPONSE(
        `No route configured for model: "${model}". Add a route for this model in ~/.cc-multi-api/config.json`,
        404
      );
    }

    const { provider, targetModel } = route;

    let resp: Response;
    let status = 0;
    let errorMsg: string | undefined;

    try {
      if (provider.protocol === "anthropic") {
        const upstreamResp = await forwardAnthropicRequest(body, provider, targetModel, fetchFn, c.req.raw.headers);
        resp = new Response(upstreamResp.body, {
          status: upstreamResp.status,
          headers: sanitizeUpstreamHeaders(upstreamResp.headers),
        });
      } else {
        const upstreamResp = await forwardOpenAIRequest(body, provider, targetModel, fetchFn);
        status = upstreamResp.status;

        if ((body as any).stream !== true) {
          const openAIResp = await upstreamResp.json();
          const { translateResponseToAnthropic } = await import("./adapters/openai.js");
          const anthropicResp = translateResponseToAnthropic(openAIResp, model);
          resp = new Response(JSON.stringify(anthropicResp), {
            status: upstreamResp.status,
            headers: { "content-type": "application/json" },
          });
        } else {
          const streamBody = await upstreamResp.text();
          const { translateStreamToAnthropic } = await import("./adapters/openai.js");
          const anthropicStream = translateStreamToAnthropic(
            (async function* () { yield streamBody; })(),
            model
          );
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async pull(controller) {
              for await (const event of anthropicStream) {
                controller.enqueue(encoder.encode(event + "\n\n"));
              }
              controller.close();
            },
          });
          resp = new Response(stream, {
            status: upstreamResp.status,
            headers: { "content-type": "text/event-stream" },
          });
        }
        status = resp.status;
      }
    } catch (e: any) {
      errorMsg = e?.message ?? "Upstream request failed";
      logger.log({
        time: new Date().toISOString(),
        model,
        provider: provider.name,
        targetModel,
        duration: Date.now() - start,
        status: 0,
        error: errorMsg,
      });
      return PROXY_ERROR_RESPONSE(errorMsg, 502);
    }

    const elapsed = Date.now() - start;
    logger.log({
      time: new Date().toISOString(),
      model,
      provider: provider.name,
      targetModel,
      duration: elapsed,
      status: resp.status,
      error: resp.ok ? undefined : `HTTP ${resp.status}`,
    });

    return resp;
  };
}

export function createProxyApp(
  fetchFn: typeof fetch,
  configOrLoader: Config | (() => Config) = loadConfig,
  logger: Logger = new Logger()
): Hono {
  const app = new Hono();
  app.post("/v1/messages", createProxyHandler(fetchFn, configOrLoader, logger));
  return app;
}
