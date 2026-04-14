import { join } from "path";

export function resolveUiFilePath(uiDir: string, urlPath: string) {
  let filePath = urlPath.slice(4);
  if (!filePath || filePath.endsWith("/")) filePath += "index.html";
  return join(uiDir, filePath);
}

export function getUiContentType(filePath: string) {
  return filePath.endsWith(".js") ? "application/javascript" :
    filePath.endsWith(".css") ? "text/css" :
    filePath.endsWith(".html") ? "text/html" :
    filePath.endsWith(".svg") ? "image/svg+xml" :
    "application/octet-stream";
}
