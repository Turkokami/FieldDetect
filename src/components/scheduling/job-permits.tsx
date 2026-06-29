"use client";

import { useState } from "react";
import { Plus, FileCheck, Trash2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

type Permit = {
  id: string;
  permitType: string;
  permitNumber: string | null;
  issuingAuthority: string | null;
  issuedDate: string | null;
  expiresDate: string | null;
  status: string;
  notes: string | null;
};

type Props = {
  appointmentId: string;
  initialPermits: Permit[];
};

const PERMIT_TYPES = [
  "Nest Removal Permit", "Wildlife Depredation Permit", "Federal Migratory Bird Permit",
  "State Pest Control License", "Business Operating Permit", "Environmental Compliance Permit",
  "Pesticide Application Permit", "Coastal / Wetlands Permit", "HOA / Property Access Permit",
  "Other",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-red-100 text-red-700",
  SUBMITTED: "bg-indigo-100 text-indigo-700",
  DENIED: "bg-red-100 text-red-700",
};

export function JobPermitsPanel({ appointmentId, initialPermits }: Props) {
  const [permits, setPermits] = useState<Permit[]>(initialPermits);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [type, setType] = useState("");
  const [number, setNumber] = useState("");
  const [authority, setAuthority] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/job-permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          permitType: type,
          permitNumber: number || null,
          issuingAuthority: authority || null,
          issuedDate: issuedDate ? new Date(issuedDate).toISOString() : null,
          expiresDate: expiresDate ? new Date(expiresDate).toISOString() : null,
          status,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPermits((prev) => [data.data, ...prev]);
      setShowForm(false);
      setType(""); setNumber(""); setAuthority(""); setIssuedDate(""); setExpiresDate(""); setStatus("PENDING"); setNotes("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this permit?")) return;
    await fetch(`/api/job-permits/${id}`, { method: "DELETE" });
    setPermits((prev) => prev.filter((p) => p.id !== id));
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/job-permits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setPermits((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Job Permits
          {permits.length > 0 && (
            <span className="ml-1 text-xs font-bold text-white bg-primary rounded-full px-1.5 py-0.5 leading-none">
              {permits.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowForm((v) => !v); setExpanded(true); }}
            className="flex items-center gap-1 px-2 h-7 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Permit
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {/* Add form */}
          {showForm && (
            <form onSubmit={handleAdd} className="p-5 space-y-3 border-b border-border bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Permit Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} required className={inp}>
                    <option value="">Select type…</option>
                    {PERMIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Permit Number</label>
                  <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. MB-2024-00123" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Issuing Authority</label>
                  <input type="text" value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="e.g. U.S. Fish & Wildlife Service" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
                    {["PENDING", "SUBMITTED", "APPROVED", "ACTIVE", "EXPIRED", "DENIED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Issue Date</label>
                  <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Expiration Date</label>
                  <input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes…" className={inp} />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 h-8 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "Adding…" : "Add Permit"}
                </button>
              </div>
            </form>
          )}

          {permits.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <FileCheck className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No permits attached to this job.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {permits.map((permit) => (
                <div key={permit.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{permit.permitType}</span>
                      <select
                        value={permit.status}
                        onChange={(e) => updateStatus(permit.id, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[permit.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {["PENDING", "SUBMITTED", "APPROVED", "ACTIVE", "EXPIRED", "DENIED"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {permit.permitNumber && <span className="font-mono">#{permit.permitNumber}</span>}
                      {permit.issuingAuthority && <span>{permit.issuingAuthority}</span>}
                      {permit.issuedDate && <span>Issued: {new Date(permit.issuedDate).toLocaleDateString()}</span>}
                      {permit.expiresDate && (
                        <span className={new Date(permit.expiresDate) < new Date() ? "text-destructive font-medium" : ""}>
                          Expires: {new Date(permit.expiresDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {permit.notes && <p className="text-xs text-muted-foreground mt-1 italic">{permit.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(permit.id)}
                    className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
