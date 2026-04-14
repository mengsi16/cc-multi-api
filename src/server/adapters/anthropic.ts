import type { Provider } from "../config.js";

function getForwardedAnthropicHeaders(requestHeaders?: Headers): Record<string, string> {
  const forwarded: Record<string, string> = {};

  if (requestHeaders) {
    for (const [key, value] of requestHeaders.entries()) {
      if (key.startsWith("anthropic-")) {
        forwarded[key] = value;
      }
    }
  }

  if (!forwarded["anthropic-version"]) {
    forwarded["anthropic-version"] = "2023-06-01";
  }

  return forwarded;
}

export async function forwardAnthropicRequest(
  body: object,
  provider: Provider,
  targetModel: string,
  fetchFn: typeof fetch,
  requestHeaders?: Headers
): Promise<Response> {
  const url = `${provider.baseUrl}/v1/messages`;

  const { anthropicVersion, ...restBody } = body as any;
  const forwardedBody = { ...restBody, model: targetModel };
  const forwardedAnthropicHeaders = getForwardedAnthropicHeaders(requestHeaders);

  const resp = await fetchFn(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...forwardedAnthropicHeaders,
      "x-api-key": provider.apiKey,
      "authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(forwardedBody),
  });

  return resp;
}
