import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface CaptureRecord {
  time: string;
  method: string;
  path: string;
  url: string;
  remoteAddress?: string;
  headers: Record<string, string>;
  body: any;
}

function redactHeaderValue(value: string): string {
  if (value.startsWith("Bearer ")) {
    return `Bearer ${redactToken(value.slice(7))}`;
  }
  return redactToken(value);
}

function redactToken(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.toLowerCase();
    result[normalizedKey] =
      normalizedKey === "authorization" || normalizedKey === "x-api-key"
        ? redactHeaderValue(value)
        : value;
  }

  return result;
}

export function buildCaptureRecord(request: Request, body: any, remoteAddress?: string): CaptureRecord {
  const url = new URL(request.url);
  return {
    time: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    url: request.url,
    remoteAddress,
    headers: normalizeHeaders(request.headers),
    body,
  };
}

function writeCapture(filePath: string, record: CaptureRecord) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function buildAnthropicResponse(model: string) {
  return {
    id: "msg_capture_ok",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: "capture ok" }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

async function readBody(request: Request) {
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const port = Number(process.env.CLAUDE_CAPTURE_PORT ?? "4567");
  const outputFile = resolve(process.env.CLAUDE_CAPTURE_FILE ?? "tmp/claude-capture/last-request.json");
  const oneShot = process.env.CLAUDE_CAPTURE_ONESHOT === "1";

  let requestCount = 0;

  const server = Bun.serve({
    port,
    async fetch(request, server) {
      if (new URL(request.url).pathname !== "/v1/messages") {
        return new Response("not found", { status: 404 });
      }

      const body = await readBody(request);
      const record = buildCaptureRecord(request, body, server.requestIP(request)?.address);
      writeCapture(outputFile, record);
      requestCount += 1;

      console.log(`[claude-capture] request #${requestCount} -> ${record.path}`);
      console.log(`[claude-capture] output: ${outputFile}`);

      if (oneShot) {
        setTimeout(() => server.stop(true), 50);
      }

      return Response.json(buildAnthropicResponse(body?.model ?? "capture-model"), {
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      });
    },
  });

  console.log(`[claude-capture] listening on http://127.0.0.1:${server.port}`);
  console.log(`[claude-capture] output file ${outputFile}`);
}

if (import.meta.main) {
  await main();
}
