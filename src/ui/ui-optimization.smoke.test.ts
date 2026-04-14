import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const readUtf8 = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("UI optimization smoke", () => {
  test("loads OLED theme variables", () => {
    const css = readUtf8("src/ui/index.css");

    expect(css).toContain(":root {");
    expect(css).toContain("[data-theme=\"dark\"]");
    expect(css).toContain("--bg-primary: #0a0a0f;");
    expect(css).toContain("--color-primary: #3b82f6;");
  });

  test("removes legacy emoji markers from key pages", () => {
    const files = [
      "src/ui/components/Sidebar.tsx",
      "src/ui/pages/Dashboard.tsx",
      "src/ui/pages/Providers.tsx",
      "src/ui/pages/RoutesPage.tsx",
      "src/ui/pages/Logs.tsx",
      "src/ui/pages/Test.tsx",
    ];

    const bannedEmoji = /[📊🔌🗺️📋⚡🟢🔴✅❌]/u;

    for (const file of files) {
      const content = readUtf8(file);
      expect(content).not.toMatch(bannedEmoji);
    }
  });

  test("renders updated sidebar metadata copy", () => {
    const sidebar = readUtf8("src/ui/components/Sidebar.tsx");
    const layout = readUtf8("src/ui/components/Layout.tsx");

    expect(sidebar).toContain("Proxy Control Deck");
    expect(sidebar).toContain("LayoutDashboard");
    expect(sidebar).toContain("切到浅色");
    expect(layout).toContain("ccma-theme");
  });
});
