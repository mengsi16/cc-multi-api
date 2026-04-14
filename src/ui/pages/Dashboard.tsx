import { useState, useEffect, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Cpu,
  Route,
  Server,
  XCircle,
  type IconComponent,
} from "../components/icons";
import { useConfig } from "../hooks/useConfig";

interface Status {
  running: boolean;
  port: number;
  requestCount: number;
  startTime: string;
}

export default function Dashboard() {
  const { config, loading: configLoading } = useConfig();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/status")
        .then(r => {
          if (!r.ok) {
            throw new Error(`status request failed: ${r.status}`);
          }
          return r.json();
        })
        .then(setStatus);

    void load();
    const id = setInterval(() => {
      void load();
    }, 5000);

    return () => clearInterval(id);
  }, []);

  const uptime = status
    ? Math.round((Date.now() - new Date(status.startTime).getTime()) / 1000)
    : 0;
  const uptimeStr =
    uptime < 60
      ? `${uptime}s`
      : uptime < 3600
        ? `${Math.floor(uptime / 60)}m`
        : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="space-y-1">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-subtitle">Proxy runtime and routing overview.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Service Status"
          icon={Activity}
          tone={status?.running ? "success" : "danger"}
          value={
            <span className="inline-flex items-center gap-2">
              {status?.running ? (
                <CheckCircle2 size={18} className="text-[var(--color-success)]" />
              ) : (
                <XCircle size={18} className="text-[var(--color-error)]" />
              )}
              {status?.running ? "Running" : "Stopped"}
            </span>
          }
        />
        <StatCard label="Port" icon={Server} value={status?.port?.toString() ?? "-"} />
        <StatCard label="Total Requests" icon={Cpu} value={status?.requestCount?.toString() ?? "-"} />
        <StatCard label="Uptime" icon={Clock3} value={uptimeStr} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.13em] text-slate-200">Providers</h3>
            <span className="text-xs text-[var(--text-muted)]">{config?.providers.length ?? 0} configured</span>
          </div>
          {configLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading providers...</p>
          ) : !config?.providers.length ? (
            <p className="text-sm text-[var(--text-muted)]">No providers configured. Add one in the Providers page.</p>
          ) : (
            <ul className="space-y-2.5">
              {config.providers.map(p => (
                <li
                  key={p.name}
                  className="panel-muted flex items-center gap-3 px-3 py-2 text-sm transition hover:border-blue-400/30"
                >
                  <span
                    className={`code-text rounded-md px-1.5 py-1 ${
                      p.protocol === "anthropic"
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {p.protocol}
                  </span>
                  <span className="font-semibold text-slate-100">{p.name}</span>
                  <span className="ml-auto truncate text-xs text-[var(--text-muted)]">{p.baseUrl}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.13em] text-slate-200">Routes</h3>
            <Route size={16} className="text-[var(--text-muted)]" />
          </div>
          {!config?.routes || Object.keys(config.routes).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No routes configured.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(config.routes).map(([model, route]) => (
                <li key={model} className="panel-muted flex items-center gap-2 px-3 py-2 text-xs md:text-sm">
                  <span
                    className={`code-text rounded px-1.5 py-1 ${
                      model === "default" ? "bg-slate-700/60 text-slate-100" : "bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    {model.length > 18 ? `${model.slice(0, 18)}...` : model}
                  </span>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-slate-200">{route?.provider ?? "-"}</span>
                  <span className="text-[var(--text-muted)]">/</span>
                  <span className="code-text text-slate-400">{route?.model ?? "-"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/55"
      : tone === "danger"
        ? "border-red-400/55"
        : "border-blue-400/40";

  return (
    <div className={`panel relative overflow-hidden border-l-2 p-4 ${toneClass}`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">{label}</p>
        <Icon size={15} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-xl font-extrabold tracking-wide text-slate-100">{value}</p>
    </div>
  );
}

