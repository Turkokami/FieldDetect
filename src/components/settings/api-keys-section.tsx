"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Plus, X } from "lucide-react";
import { toast } from "sonner";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ApiKeysSection({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("Roof Estimator");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (!name.trim()) { toast.error("Give the key a name"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const { key, ...row } = json.data as ApiKeyRow & { key: string };
      setKeys((prev) => [row, ...prev]);
      setNewKey({ name: row.name, key });
      setCopied(false);
      setShowAdd(false);
      setName("Roof Estimator");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (row: ApiKeyRow) => {
    if (!confirm(`Revoke "${row.name}"? Anything using this key stops working immediately.`)) return;
    try {
      const res = await fetch(`/api/settings/api-keys/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setKeys((prev) => prev.map((k) => (k.id === row.id ? { ...k, revokedAt: data.revokedAt } : k)));
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {newKey && (
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-amber-900">
              Copy the key for &ldquo;{newKey.name}&rdquo; now. It won&apos;t be shown again.
            </p>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="text-amber-700 hover:text-amber-900"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-md bg-white border border-amber-200 px-3 py-2 text-xs font-mono text-foreground">
              {newKey.key}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="inline-flex shrink-0 items-center gap-1.5 px-3 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-amber-800">
            Store it as an environment variable in the app that uses it (for example in Vercel). Don&apos;t paste it into chat or email.
          </p>
        </div>
      )}

      {keys.length === 0 && !showAdd ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No API keys yet. Create one to let an outside tool, like the Roof Estimator, send leads to this organization.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Key
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {keys.map((k) => (
              <div key={k.id} className="px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={`text-sm font-medium ${k.revokedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {k.name}
                    </span>
                    <code className="text-xs font-mono text-muted-foreground">{k.prefix}…</code>
                    {k.revokedAt && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Revoked</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {k.revokedAt
                      ? `Revoked ${formatDate(k.revokedAt)}`
                      : `Last used: ${formatDate(k.lastUsedAt)} · Created ${formatDate(k.createdAt)}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Access: {k.scopes.join(", ")}</p>
                </div>
                {!k.revokedAt && (
                  <button
                    type="button"
                    onClick={() => revoke(k)}
                    className="shrink-0 px-3 h-8 rounded-md text-xs font-medium border border-border text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-border">
            {showAdd ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Key name, e.g. Roof Estimator"
                  maxLength={80}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={create}
                    disabled={saving}
                    className="px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-4 h-9 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Create Key
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
