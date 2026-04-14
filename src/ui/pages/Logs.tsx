import { CircleSlash, PlugZap, RotateCw, Signal, Trash2 } from "../components/icons";
import { useLogs } from "../hooks/useLogs";

export default function Logs() {
  const { logs, connected, clear } = useLogs();

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Request Logs</h2>
          <p className="page-subtitle">Live request trail from the proxy runtime.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs code-text ${
              connected
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                : "border-red-400/40 bg-red-500/20 text-red-200"
            }`}
          >
            {connected ? <Signal size={13} /> : <CircleSlash size={13} />}
            {connected ? "SSE live" : "disconnected"}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{logs.length} entries</span>
          <button onClick={clear} className="button-ghost">
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-[var(--text-muted)]">
          No requests logged yet. Send a request through the proxy.
        </div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-[rgba(37,44,60,0.54)]">
                    <td className="code-text px-3 py-2 text-[var(--text-muted)]">{log.time.slice(11, 19)}</td>
                    <td className="code-text px-3 py-2 text-slate-200">{log.model}</td>
                    <td className="px-3 py-2 text-blue-200">{log.provider}</td>
                    <td className="code-text px-3 py-2 text-[var(--text-secondary)]">{log.targetModel}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{log.duration}ms</td>
                    <td className="px-3 py-2">{renderStatus(log.status, log.error)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function renderStatus(status: number, error?: string) {
  if (status === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs code-text bg-red-500/20 text-red-200">
        <CircleSlash size={12} />
        {error ?? "error"}
      </span>
    );
  }

  if (status >= 200 && status < 300) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs code-text bg-emerald-500/20 text-emerald-200">
        <PlugZap size={12} />
        {status}
      </span>
    );
  }

  if (status >= 400 && status < 500) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs code-text bg-amber-500/20 text-amber-200">
        <RotateCw size={12} />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs code-text bg-red-500/20 text-red-200">
      <CircleSlash size={12} />
      {status}
    </span>
  );
}

