/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";

describe("Web UI routing", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState({}, "", "/ui/");
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

        if (url.endsWith("/api/status")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                running: true,
                port: 3456,
                requestCount: 0,
                startTime: "2026-04-11T00:00:00.000Z",
              }),
          });
        }

        if (url.endsWith("/api/config")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                port: 3456,
                providers: [],
                routes: {},
              }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              logs: [],
            }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  test("renders dashboard content when opened from /ui/", async () => {
    await import("./main");

    expect(await screen.findByText("Total Requests")).toBeTruthy();
  });
});
