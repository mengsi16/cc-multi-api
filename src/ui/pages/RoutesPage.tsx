import { useState } from "react";
import { ArrowRight, PencilLine, Plus, Route, Trash2, X } from "../components/icons";
import { useConfig, type Route as RouteConfig } from "../hooks/useConfig";

export default function RoutesPage() {
  const { config, loading, updateConfig } = useConfig();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<{ model: string; provider: string; targetModel: string }>({ model: "", provider: "", targetModel: "" });

  const handleAdd = () => {
    setEditingKey("__new__");
    setForm({ model: "", provider: config?.providers[0]?.name ?? "", targetModel: "" });
  };

  const handleEdit = (key: string, route: RouteConfig) => {
    setEditingKey(key);
    setForm({ model: key === "default" ? "default" : key, provider: route.provider, targetModel: route.model });
  };

  const handleDelete = async (key: string) => {
    const routes = { ...config?.routes };
    delete routes[key];
    await updateConfig({ routes });
  };

  const handleSave = async () => {
    if (!form.model || !form.provider || !form.targetModel) return;
    const routes = { ...config?.routes };
    if (editingKey === "__new__") {
      routes[form.model] = { provider: form.provider, model: form.targetModel };
    } else {
      if (editingKey && editingKey !== "__new__" && editingKey !== form.model) {
        delete routes[editingKey];
      }
      routes[form.model] = { provider: form.provider, model: form.targetModel };
    }
    await updateConfig({ routes });
    setEditingKey(null);
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading routes...</div>;

  const entries = Object.entries(config?.routes ?? {}).filter(([, v]) => v !== null);

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Routes</h2>
          <p className="page-subtitle">Map incoming model names to provider targets.</p>
        </div>
        <button onClick={handleAdd} className="button-primary">
          <Plus size={16} />
          Add Route
        </button>
      </header>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                <th className="px-4 py-3">Model Name</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Target Model</th>
                <th className="px-4 py-3 w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                    No routes configured.
                  </td>
                </tr>
              )}
              {entries.map(([key, route]) => (
                <tr key={key} className="hover:bg-[rgba(40,44,61,0.55)]">
                  <td className="px-4 py-3">
                    <span
                      className={`code-text rounded px-2 py-1 ${
                        key === "default" ? "bg-slate-700/60 text-slate-100" : "bg-slate-800/70 text-slate-300"
                      }`}
                    >
                      {key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{route?.provider ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                      <ArrowRight size={13} className="text-[var(--text-muted)]" />
                      <span className="code-text text-slate-300">{route?.model ?? "-"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(key, route!)} className="button-ghost py-1.5">
                        <PencilLine size={13} />
                        Edit
                      </button>
                      <button onClick={() => handleDelete(key)} className="button-danger py-1.5">
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingKey !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">{editingKey === "__new__" ? "Add Route" : "Edit Route"}</h3>
              <button onClick={() => setEditingKey(null)} className="button-ghost p-2" aria-label="Close route form">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Model Name
                </label>
                <input
                  className="input-base code-text"
                  placeholder="claude-sonnet-4-5"
                  value={form.model}
                  disabled={editingKey !== "__new__" && form.model === "default"}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Use `default` for fallback route.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Provider</label>
                <select
                  className="input-base"
                  value={form.provider}
                  onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                >
                  {config?.providers.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.protocol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Target Model</label>
                <input
                  className="input-base code-text"
                  placeholder="deepseek-chat"
                  value={form.targetModel}
                  onChange={e => setForm(f => ({ ...f, targetModel: e.target.value }))}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Actual model name on that provider.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditingKey(null)} className="button-ghost">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!form.model || !form.provider || !form.targetModel}
                className="button-primary"
              >
                <Route size={15} />
                Save Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

