import { useState, useEffect, useRef } from "react";

export interface LogEntry {
  id: string;
  time: string;
  model: string;
  provider: string;
  targetModel: string;
  duration: number;
  status: number;
  error?: string;
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Load initial logs
    fetch("/api/logs")
      .then(r => r.json())
      .then((initial: LogEntry[]) => setLogs(initial.slice(0, 200)));

    // Connect SSE for real-time updates
    const es = new EventSource("/api/logs/stream");
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setLogs(prev => [entry, ...prev].slice(0, 200));
      } catch {}
    };

    return () => {
      es.close();
    };
  }, []);

  const clear = () => setLogs([]);

  return { logs, connected, clear };
}
