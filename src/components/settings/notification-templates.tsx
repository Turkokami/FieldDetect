"use client";

import { useState } from "react";

type Template = {
  id: string;
  type: string;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
};

const NOTIFICATION_TYPES = [
  { value: "APPOINTMENT_CONFIRMATION", label: "Appointment Confirmation", vars: ["{{customerName}}", "{{date}}", "{{time}}", "{{propertyName}}", "{{technicianName}}"] },
  { value: "TECHNICIAN_EN_ROUTE",      label: "Technician En Route",      vars: ["{{customerName}}", "{{technicianName}}", "{{eta}}"] },
  { value: "INSPECTION_COMPLETE",      label: "Inspection Complete",       vars: ["{{customerName}}", "{{propertyName}}", "{{reportLink}}"] },
  { value: "REPORT_READY",             label: "Report Ready",              vars: ["{{customerName}}", "{{reportLink}}"] },
  { value: "INVOICE_SENT",             label: "Invoice Sent",              vars: ["{{customerName}}", "{{amount}}", "{{paymentLink}}"] },
  { value: "FOLLOW_UP_NEEDED",         label: "Follow-Up Needed",          vars: ["{{customerName}}", "{{propertyName}}", "{{followUpDate}}"] },
  { value: "APPOINTMENT_REMINDER",     label: "Appointment Reminder",      vars: ["{{customerName}}", "{{date}}", "{{time}}", "{{propertyName}}"] },
  { value: "APPOINTMENT_CANCELLED",    label: "Appointment Cancelled",     vars: ["{{customerName}}", "{{date}}"] },
];

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
};

export default function NotificationTemplates({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editing, setEditing] = useState<{ type: string; channel: string } | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const getTemplate = (type: string, channel: string) =>
    templates.find((t) => t.type === type && t.channel === channel);

  const startEdit = (type: string, channel: string) => {
    const t = getTemplate(type, channel);
    setEditBody(t?.body ?? "");
    setEditSubject(t?.subject ?? "");
    setEditActive(t?.isActive ?? true);
    setEditing({ type, channel });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editing.type,
          channel: editing.channel,
          subject: editSubject || null,
          body: editBody,
          isActive: editActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setTemplates((prev) => {
        const exists = prev.find((t) => t.type === editing.type && t.channel === editing.channel);
        if (exists) return prev.map((t) => t.type === editing.type && t.channel === editing.channel ? data.data : t);
        return [...prev, data.data];
      });
      setEditing(null);
      showToast("Template saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const editingTypeDef = NOTIFICATION_TYPES.find((t) => t.value === editing?.type);

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-foreground text-background text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Customize the messages sent to customers. Use template variables (shown below each template) to insert dynamic content.
      </p>

      <div className="space-y-4">
        {NOTIFICATION_TYPES.map((nt) => (
          <div key={nt.value} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-foreground">{nt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Variables: {nt.vars.join(", ")}
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {["EMAIL", "SMS"].map((channel) => {
                const t = getTemplate(nt.value, channel);
                return (
                  <div key={channel} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{CHANNEL_LABELS[channel]}</span>
                        {t && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${t.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {t.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                        {!t && (
                          <span className="text-xs text-muted-foreground italic">Using default</span>
                        )}
                      </div>
                      {t && channel === "EMAIL" && t.subject && (
                        <div className="text-xs font-medium text-foreground mb-0.5">Subject: {t.subject}</div>
                      )}
                      {t ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No custom template — system default will be used.</p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(nt.value, channel)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors flex-shrink-0"
                    >
                      {t ? "Edit" : "Customize"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-foreground mb-1">
              Edit {CHANNEL_LABELS[editing.channel]} Template
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {editingTypeDef?.label}
            </p>

            <div className="space-y-4">
              {editing.channel === "EMAIL" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40"
                    placeholder="Email subject line…"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                  {editing.channel === "SMS" ? "Message" : "Body"}
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={editing.channel === "SMS" ? 4 : 8}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40"
                  placeholder={`Enter your ${editing.channel === "SMS" ? "SMS message" : "email body"}…`}
                />
                {editing.channel === "SMS" && (
                  <p className="text-xs text-muted-foreground mt-1">{editBody.length} / 160 chars</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tpl-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="tpl-active" className="text-sm text-foreground">Active (send this template)</label>
              </div>
              {editingTypeDef && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Available variables:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editingTypeDef.vars.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setEditBody((b) => b + v)}
                        className="text-xs px-2 py-0.5 rounded bg-background border border-border font-mono hover:bg-muted transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editBody.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#0ABAB5" }}
              >
                {saving ? "Saving…" : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
