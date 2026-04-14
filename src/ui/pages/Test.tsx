import { useState } from "react";
import {
  CheckCircle2,
  CircleSlash,
  FlaskConical,
  LoaderCircle,
  Play,
  ShieldAlert,
  Timer,
} from "../components/icons";
import { useConfig } from "../hooks/useConfig";

interface TestResult {
  provider: string;
  success: boolean;
  latency?: number;
  status?: number;
  error?: string;
}

export default function Test() {
  const { config, loading } = useConfig();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Set<string>>(new Set());

  const testAll = async () => {
    for (const p of config?.providers ?? []) {
      await testProvider(p.name);
    }
  };

  const testProvider = async (name: string) => {
    setTesting(prev => new Set([...prev, name]));
    try {
      const resp = await fetch(`/api/test/${name}`, { method: "POST" });
      const data = await resp.json();
      setResults(prev => ({ ...prev, [name]: { provider: name, ...data } }));
    } catch (e: any) {
      setResults(prev => ({ ...prev, [name]: { provider: name, success: false, error: e?.message ?? "failed" } }));
    } finally {
      setTesting(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading providers...</div>;

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Connectivity Test</h2>
          <p className="page-subtitle">Verify each provider API key and endpoint connectivity.</p>
        </div>
        <button onClick={testAll} disabled={testing.size > 0} className="button-primary">
          {testing.size > 0 ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
          {testing.size > 0 ? `Testing ${testing.size}...` : "Test All"}
        </button>
      </header>

      {(!config?.providers || config.providers.length === 0) && (
        <div className="panel p-8 text-center text-sm text-[var(--text-muted)]">
          No providers to test. Add providers first.
        </div>
      )}

      <section className="space-y-3">
        {config?.providers.map(p => {
          const result = results[p.name];
          const isTesting = testing.has(p.name);

          return (
            <article key={p.name} className="panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/35 bg-blue-500/15 text-blue-200">
                  <FlaskConical size={16} />
                </span>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{p.name}</span>
                    <span
                      className={`code-text rounded-md px-2 py-0.5 ${
                        p.protocol === "anthropic" ? "bg-blue-500/20 text-blue-200" : "bg-emerald-500/20 text-emerald-200"
                      }`}
                    >
                      {p.protocol}
                    </span>
                  </div>
                  <p className="code-text truncate text-[var(--text-secondary)]">{p.baseUrl}</p>
                </div>
              </div>

              <div className="min-w-[180px] text-right">{renderTestResult(isTesting, result)}</div>

              <button onClick={() => testProvider(p.name)} disabled={isTesting} className="button-ghost">
                {isTesting ? <LoaderCircle size={14} className="animate-spin" /> : <Timer size={14} />}
                {isTesting ? "Testing" : "Run"}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function renderTestResult(isTesting: boolean, result?: TestResult) {
  if (isTesting) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-blue-200">
        <LoaderCircle size={14} className="animate-spin" />
        Testing...
      </span>
    );
  }

  if (!result) {
    return <span className="text-sm text-[var(--text-muted)]">Not tested</span>;
  }

  if (result.success) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-sm text-emerald-200">
        <CheckCircle2 size={14} />
        {result.latency}ms
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1 text-sm text-red-200">
      {result.status ? <ShieldAlert size={14} /> : <CircleSlash size={14} />}
      {result.status ?? "ERR"} {result.error?.slice(0, 48)}
    </span>
  );
}

