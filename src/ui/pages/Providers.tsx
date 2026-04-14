import { useState } from "react";
import { PencilLine, Plus, Server, Trash2, X } from "../components/icons";
import { useConfig, type Provider } from "../hooks/useConfig";

interface ProviderForm {
  name: string;
  protocol: "anthropic" | "openai";
  baseUrl: string;
  apiKey: string;
}

export function getProviderFormState(provider: Provider): {
  form: ProviderForm;
  requiresApiKeyReset: boolean;
} {
  const requiresApiKeyReset = provider.apiKey.includes("*");

  return {
    form: {
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: requiresApiKeyReset ? "" : provider.apiKey,
    },
    requiresApiKeyReset,
  };
}

export default function Providers() {
  const { config, loading, updateConfig } = useConfig();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<ProviderForm>({
    name: "",
    protocol: "anthropic",
    baseUrl: "",
    apiKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [requiresApiKeyReset, setRequiresApiKeyReset] = useState(false);

  const handleAdd = () => {
    setEditing({ name: "", protocol: "anthropic", baseUrl: "", apiKey: "" });
    setForm({ name: "", protocol: "anthropic", baseUrl: "", apiKey: "" });
    setSaveError(null);
    setRequiresApiKeyReset(false);
  };

  const handleEdit = (provider: Provider) => {
    const state = getProviderFormState(provider);
    setEditing(provider);
    setForm(state.form);
    setSaveError(null);
    setRequiresApiKeyReset(state.requiresApiKeyReset);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete provider "${name}"?`)) return;
    const providers = (config?.providers ?? []).filter(p => p.name !== name);
    await updateConfig({ providers });
  };

  const handleSave = async () => {
    if (!form.name || !form.baseUrl || !form.apiKey) return;
    setSaving(true);
    setSaveError(null);

    try {
      let providers = (config?.providers ?? []).filter(p => p.name !== editing?.name);
      providers = [
        ...providers,
        {
          name: form.name,
          protocol: form.protocol,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
        },
      ];
      await updateConfig({ providers });
      setEditing(null);
      setRequiresApiKeyReset(false);
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading providers...</div>;

  return (
    <div className="space-y-6 md:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Providers</h2>
          <p className="page-subtitle">Manage upstream provider endpoints and credentials.</p>
        </div>
        <button onClick={handleAdd} className="button-primary">
          <Plus size={16} />
          Add Provider
        </button>
      </header>

      {config?.providers.length === 0 && (
        <div className="panel p-8 text-center text-sm text-[var(--text-muted)]">
          No providers configured. Create your first provider entry.
        </div>
      )}

      <section className="space-y-3">
        {config?.providers.map(provider => (
          <article key={provider.name} className="panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/35 bg-blue-500/15 text-blue-200">
                <Server size={16} />
              </span>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{provider.name}</span>
                  <span
                    className={`code-text rounded-md px-2 py-0.5 ${
                      provider.protocol === "anthropic" ? "bg-blue-500/20 text-blue-200" : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {provider.protocol}
                  </span>
                </div>
                <p className="code-text truncate text-[var(--text-secondary)]">{provider.baseUrl}</p>
                <p className="code-text mt-1 text-[var(--text-muted)]">Key: {provider.apiKey.replace(/./g, "•")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(provider)} className="button-ghost">
                <PencilLine size={14} />
                Edit
              </button>
              <button onClick={() => handleDelete(provider.name)} className="button-danger">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">{editing.name ? "Edit Provider" : "Add Provider"}</h3>
              <button onClick={() => setEditing(null)} className="button-ghost p-2" aria-label="Close provider form">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Name</label>
                <input
                  className="input-base"
                  placeholder="e.g. deepseek"
                  value={form.name}
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Protocol</label>
                <select
                  className="input-base"
                  value={form.protocol}
                  onChange={e => setForm(current => ({ ...current, protocol: e.target.value as "anthropic" | "openai" }))}
                >
                  <option value="anthropic">Anthropic (passthrough)</option>
                  <option value="openai">OpenAI (translation)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Base URL</label>
                <input
                  className="input-base code-text"
                  placeholder="https://api.deepseek.com"
                  value={form.baseUrl}
                  onChange={e => setForm(current => ({ ...current, baseUrl: e.target.value }))}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Do not append `/v1/messages`.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">API Key</label>
                <input
                  className="input-base code-text"
                  type="password"
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={e => {
                    setForm(current => ({ ...current, apiKey: e.target.value }));
                    setRequiresApiKeyReset(false);
                  }}
                />
                {requiresApiKeyReset && (
                  <p className="mt-1 text-xs text-amber-600">
                    当前存储的是脱敏或占位 API Key，需要重新输入真实 Key 才能保存。
                  </p>
                )}
              </div>
            </div>

            {saveError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="button-ghost">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.baseUrl || !form.apiKey}
                className="button-primary"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
