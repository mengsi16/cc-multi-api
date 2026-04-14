import { describe, expect, test } from "bun:test";
import { normalize } from "path";

import { resolveUiFilePath } from "./ui-static.js";

describe("resolveUiFilePath", () => {
  test("resolves asset requests under dist/ui/assets", () => {
    expect(normalize(resolveUiFilePath("E:/app/dist/ui", "/ui/assets/index.js"))).toBe(
      normalize("E:/app/dist/ui/assets/index.js")
    );
  });

  test("resolves /ui/ to dist/ui/index.html", () => {
    expect(normalize(resolveUiFilePath("E:/app/dist/ui", "/ui/"))).toBe(
      normalize("E:/app/dist/ui/index.html")
    );
  });
});
