// ── Ring buffer logger with SSE subscriber support ─────────────────────────────

export interface LogEntry {
  id: string;
  time: string;
  model: string;
  provider: string;
  targetModel: string;
  duration: number;   // ms
  status: number;     // HTTP status
  error?: string;
}

type Subscriber = (entry: LogEntry) => void;

export class Logger {
  private buffer: LogEntry[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private counter = 0;
  private readonly maxSize: number;

  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize ?? 500;
  }

  log(entry: Omit<LogEntry, "id">): LogEntry {
    const fullEntry: LogEntry = {
      ...entry,
      id: `log_${++this.counter}_${Date.now()}`,
    };
    this.buffer.push(fullEntry);

    // Ring buffer: evict oldest if over capacity
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    // Notify all subscribers
    for (const sub of this.subscribers) {
      try {
        sub(fullEntry);
      } catch {
        // Subscriber threw — remove it to prevent cascading errors
        this.subscribers.delete(sub);
      }
    }

    return fullEntry;
  }

  getLogs(): LogEntry[] {
    // Return newest-first (reverse of insertion order)
    return [...this.buffer].reverse();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getStats(): { total: number; activeSubscribers: number } {
    return {
      total: this.buffer.length,
      activeSubscribers: this.subscribers.size,
    };
  }
}
