import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";

type RawCapture = {
  method: string;
  url: string;
  rawHeaders: string[];
  body: string;
};

export function serializeRawCapture(capture: RawCapture): string {
  const headerLines: string[] = [];
  for (let index = 0; index < capture.rawHeaders.length; index += 2) {
    const key = capture.rawHeaders[index] ?? "";
    const value = capture.rawHeaders[index + 1] ?? "";
    headerLines.push(`${key}: ${value}`);
  }

  return [
    `${capture.method} ${capture.url}`,
    "",
    ...headerLines,
    "",
    capture.body,
    "",
  ].join("\n");
}

export function shouldStopAfterCapture(oneShot: boolean, method: string): boolean {
  return oneShot && method.toUpperCase() !== "HEAD";
}

function main() {
  const port = Number(process.env.CLAUDE_RAW_CAPTURE_PORT ?? "4567");
  const outputFile = resolve(process.env.CLAUDE_RAW_CAPTURE_FILE ?? "tmp/claude-raw-capture/last-request.txt");
  const historyFile = resolve(process.env.CLAUDE_RAW_CAPTURE_HISTORY_FILE ?? "tmp/claude-raw-capture/all-requests.txt");
  const oneShot = process.env.CLAUDE_RAW_CAPTURE_ONESHOT === "1";

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const serialized = serializeRawCapture({
        method: request.method ?? "GET",
        url: request.url ?? "/",
        rawHeaders: request.rawHeaders,
        body,
      });

      mkdirSync(dirname(outputFile), { recursive: true });
      writeFileSync(outputFile, serialized, "utf8");
      writeFileSync(historyFile, `${serialized}\n====\n`, { encoding: "utf8", flag: "a" });

      console.log(`[claude-raw-capture] captured ${request.method ?? "GET"} ${request.url ?? "/"}`);
      console.log(`[claude-raw-capture] output: ${outputFile}`);
      console.log(`[claude-raw-capture] history: ${historyFile}`);

      response.statusCode = 500;
      response.setHeader("content-type", "text/plain; charset=utf-8");
      response.end("captured");

      if (shouldStopAfterCapture(oneShot, request.method ?? "GET")) {
        setTimeout(() => server.close(), 50);
      }
    });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[claude-raw-capture] listening on http://127.0.0.1:${port}`);
    console.log(`[claude-raw-capture] output file ${outputFile}`);
    console.log(`[claude-raw-capture] history file ${historyFile}`);
  });
}

if (import.meta.main) {
  main();
}
