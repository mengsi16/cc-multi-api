import { Hono } from "hono";
import { loadConfig } from "./config.js";
import { createProxyApp } from "./proxy.js";
import { createApiApp, Logger } from "./api.js";
import { getUiContentType, resolveUiFilePath } from "./ui-static.js";

const config = loadConfig();
const logger = new Logger();

const proxyApp = createProxyApp(fetch, loadConfig, logger);
const apiApp = createApiApp(logger);

// Serve static UI files from dist/ui/
const UI_DIR = new URL("../../dist/ui", import.meta.url).pathname
  .replace(/^\/([A-Z]):/, "$1:"); // convert /E:/ → E:\ on Windows

const app = new Hono();

// Serve /ui/* from dist/ui/
app.use("/ui/*", async (c) => {
  const urlPath = c.req.path;
  const filePath = resolveUiFilePath(UI_DIR, urlPath);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return c.body(file, { contentType: getUiContentType(filePath) });
  }
  // SPA fallback: serve index.html for any unmatched /ui/* path
  const index = Bun.file(UI_DIR + "/index.html");
  if (await index.exists()) return c.body(index, { contentType: "text/html" });
  return c.text("UI not found — run: bun run build", 404);
});

// Root redirect to /ui/
app.get("/", (c) => c.redirect("/ui/"));

// Mount API routes under /api prefix, proxy routes at root
app.route("/", proxyApp);
app.route("/", apiApp);

console.log(`cc-multi-api starting on http://localhost:${config.port}`);
console.log(`Config: ~/.cc-multi-api/config.json`);
console.log(`UI:    http://localhost:${config.port}/ui`);
console.log(`Press Ctrl+C to stop`);

Bun.serve({
  fetch: app.fetch,
  port: config.port,
});
