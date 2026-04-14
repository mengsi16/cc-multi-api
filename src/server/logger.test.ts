import { describe, test, expect } from "bun:test";

// ── Test data ─────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<import("./logger.js").LogEntry> = {}): import("./logger.js").LogEntry => ({
  id: `log_${Date.now()}-${Math.random()}`,
  time: new Date().toISOString(),
  model: "claude-sonnet-4-5",
  provider: "deepseek",
  targetModel: "deepseek-chat",
  duration: 1234,
  status: 200,
  ...overrides,
});

// ── RED: Failing tests ─────────────────────────────────────────────────────────

describe("Logger ring buffer", async () => {
  const { Logger } = await import("./logger.js");

  test("starts empty", () => {
    const logger = new Logger();
    expect(logger.getLogs()).toHaveLength(0);
  });

  test("logs one entry and returns it", () => {
    const logger = new Logger();
    logger.log(makeEntry({ model: "test-model" }));
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].model).toBe("test-model");
  });

  test("returns entries newest-first", () => {
    const logger = new Logger();
    logger.log(makeEntry({ model: "first" }));
    logger.log(makeEntry({ model: "second" }));
    logger.log(makeEntry({ model: "third" }));
    const logs = logger.getLogs();
    expect(logs[0].model).toBe("third");
    expect(logs[1].model).toBe("second");
    expect(logs[2].model).toBe("first");
  });

  test("keeps only the last 500 entries (ring buffer)", () => {
    const logger = new Logger({ maxSize: 500 });
    for (let i = 0; i < 550; i++) {
      logger.log(makeEntry({ model: `model-${i}` }));
    }
    const logs = logger.getLogs();
    expect(logs).toHaveLength(500);
    // Oldest entries should be discarded (model-0 through model-49 are gone)
    expect(logs.find(l => l.model === "model-0")).toBeUndefined();
    expect(logs.find(l => l.model === "model-49")).toBeUndefined();
    // model-50 onwards should be present
    expect(logs.find(l => l.model === "model-50")).toBeDefined();
    // Newest entries should be present
    expect(logs.find(l => l.model === "model-549")).toBeDefined();
  });

  test("calls subscriber callback on new log entry", async () => {
    const logger = new Logger();
    let called = false;
    let received: import("./logger.js").LogEntry | null = null;
    const unsub = logger.subscribe((entry) => {
      called = true;
      received = entry;
    });
    logger.log(makeEntry({ model: "subscriber-test" }));
    expect(called).toBe(true);
    expect(received?.model).toBe("subscriber-test");
    unsub();
  });

  test("does not call subscriber after unsubscribe", () => {
    const logger = new Logger();
    let count = 0;
    const unsub = logger.subscribe(() => { count++; });
    logger.log(makeEntry());
    logger.log(makeEntry());
    unsub();
    logger.log(makeEntry());
    expect(count).toBe(2);
  });

  test("multiple subscribers all get called", () => {
    const logger = new Logger();
    let count1 = 0, count2 = 0;
    const unsub1 = logger.subscribe(() => { count1++; });
    const unsub2 = logger.subscribe(() => { count2++; });
    logger.log(makeEntry());
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    unsub1();
    unsub2();
  });
});
