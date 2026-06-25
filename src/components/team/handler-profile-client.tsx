"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type HandlerCert = {
  id: string;
  name: string;
  issuedBy: string | null;
  certNumber: string | null;
  issuedAt: string | Date | null;
  expiresAt: string | Date | null;
  notes: string | null;
};

type Handler = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  handlerNotes: string | null;
  specialties: string[];
  handlerPhotos: string[];
  handlerCertifications: HandlerCert[];
};

// ─── Specialty options ─────────────────────────────────────────────────────

const SPECIALTY_OPTIONS = [
  { value: "bed_bug",       label: "Bed Bug" },
  { value: "rodent",        label: "Rodent" },
  { value: "goose",         label: "Goose" },
  { value: "termite",       label: "Termite" },
  { value: "general",       label: "General Pest" },
  { value: "narcotics",     label: "Narcotics" },
  { value: "explosives",    label: "Explosives" },
  { value: "search_rescue", label: "Search & Rescue" },
];

const SPECIALTY_MAP = Object.fromEntries(SPECIALTY_OPTIONS.map((o) => [o.value, o.label]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

function isExpired(d: string | Date | null | undefined) {
  return d ? new Date(d) < new Date() : false;
}

function isExpiringSoon(d: string | Date | null | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  if (dt < new Date()) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  return dt < soon;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ title, onAdd, canEdit }: { title: string; onAdd: () => void; canEdit: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {canEdit && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(10,186,181,0.1)", color: "#0ABAB5" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-center py-8 text-sm text-muted-foreground">{label}</div>;
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors shrink-0"
      title="Delete"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const textareaCls = "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none";

function ModalActions({ onCancel, loading, label }: { onCancel: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? "Saving..." : label}
      </button>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ handler, canEdit }: { handler: Handler; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    handlerNotes: handler.handlerNotes ?? "",
    selectedSpecialties: [...handler.specialties],
  });

  const toggleSpecialty = (value: string) => {
    setForm((f) => ({
      ...f,
      selectedSpecialties: f.selectedSpecialties.includes(value)
        ? f.selectedSpecialties.filter((s) => s !== value)
        : [...f.selectedSpecialties, value],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${handler.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handlerNotes: form.handlerNotes || null,
          specialties: form.selectedSpecialties,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setEditing(false);
      toast.success("Profile updated");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-5">
        <Field label="Specialties">
          <div className="flex flex-wrap gap-2 mt-1">
            {SPECIALTY_OPTIONS.map((opt) => {
              const active = form.selectedSpecialties.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSpecialty(opt.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={
                    active
                      ? { background: "rgba(10,186,181,0.15)", color: "#0ABAB5", borderColor: "#0ABAB5" }
                      : { background: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Handler Notes">
          <textarea
            className={textareaCls}
            rows={4}
            value={form.handlerNotes}
            onChange={(e) => setForm((f) => ({ ...f, handlerNotes: e.target.value }))}
            placeholder="Relevant notes about this handler, experience, working style..." />
        </Field>
        <ModalActions onCancel={() => setEditing(false)} loading={loading} label="Save" />
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Specialties</div>
        {handler.specialties.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {handler.specialties.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: "rgba(10,186,181,0.1)", color: "#0ABAB5", border: "1px solid rgba(10,186,181,0.25)" }}
              >
                {SPECIALTY_MAP[s] ?? s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60">No specialties set</p>
        )}
      </div>

      {handler.handlerNotes && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{handler.handlerNotes}</p>
        </div>
      )}

      {!handler.handlerNotes && handler.specialties.length === 0 && (
        <p className="text-sm text-muted-foreground">No profile info recorded yet.</p>
      )}

      {canEdit && (
        <button onClick={() => setEditing(true)} className="text-sm font-medium transition-colors" style={{ color: "#0ABAB5" }}>
          Edit profile →
        </button>
      )}
    </div>
  );
}

// ─── Tab: Certifications ──────────────────────────────────────────────────────

function CertificationsTab({ handler, canEdit }: { handler: Handler; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", issuedBy: "", certNumber: "", issuedAt: "", expiresAt: "", notes: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${handler.id}/handler-certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          issuedBy: form.issuedBy || null,
          certNumber: form.certNumber || null,
          issuedAt: form.issuedAt ? new Date(form.issuedAt).toISOString() : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ name: "", issuedBy: "", certNumber: "", issuedAt: "", expiresAt: "", notes: "" });
      toast.success("Certification added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (certId: string) => {
    const res = await fetch(`/api/users/${handler.id}/handler-certifications/${certId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Certifications" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {handler.handlerCertifications.length === 0 ? (
        <EmptyState label="No certifications recorded yet" />
      ) : (
        <div className="space-y-2">
          {handler.handlerCertifications.map((c) => {
            const expBadge = isExpired(c.expiresAt)
              ? <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expired</span>
              : isExpiringSoon(c.expiresAt)
              ? <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Expiring Soon</span>
              : c.expiresAt
              ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Active</span>
              : null;

            return (
              <div key={c.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    {expBadge}
                  </div>
                  {c.certNumber && <div className="text-xs text-muted-foreground mt-0.5">Cert #: {c.certNumber}</div>}
                  {c.issuedBy && <div className="text-xs text-muted-foreground">Issued by: {c.issuedBy}</div>}
                  <div className="text-xs text-muted-foreground">
                    {c.issuedAt && `Issued: ${fmt(c.issuedAt)}`}
                    {c.issuedAt && c.expiresAt && " · "}
                    {c.expiresAt && `Expires: ${fmt(c.expiresAt)}`}
                  </div>
                  {c.notes && <div className="text-xs text-muted-foreground italic mt-1">{c.notes}</div>}
                </div>
                {canEdit && <DeleteBtn onDelete={() => del(c.id)} />}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Certification" onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Certification Name *">
              <input required className={inputCls} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. NAPCA, Bed Bug Handler, IPM License" />
            </Field>
            <Field label="Cert Number">
              <input className={inputCls} value={form.certNumber}
                onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))} />
            </Field>
            <Field label="Issued By">
              <input className={inputCls} value={form.issuedBy}
                onChange={(e) => setForm((f) => ({ ...f, issuedBy: e.target.value }))}
                placeholder="Certifying organization or state" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue Date">
                <input type="date" className={inputCls} value={form.issuedAt}
                  onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))} />
              </Field>
              <Field label="Expiry Date">
                <input type="date" className={inputCls} value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={textareaCls} rows={2} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            <ModalActions onCancel={() => setShowAdd(false)} loading={loading} label="Add" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Photos ──────────────────────────────────────────────────────────────

function PhotosTab({ handler, canEdit }: { handler: Handler; canEdit: boolean }) {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);
    try {
      const updated = [...handler.handlerPhotos, urlInput.trim()];
      const res = await fetch(`/api/users/${handler.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handlerPhotos: updated }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setUrlInput("");
      toast.success("Photo added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const removePhoto = async (url: string) => {
    const updated = handler.handlerPhotos.filter((p) => p !== url);
    const res = await fetch(`/api/users/${handler.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handlerPhotos: updated }),
    });
    if (!res.ok) { toast.error("Failed to remove"); return; }
    toast.success("Photo removed");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Handler Photos</h2>
      </div>

      {handler.handlerPhotos.length === 0 ? (
        <EmptyState label="No photos added yet" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {handler.handlerPhotos.map((url) => (
            <div key={url} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              {canEdit && (
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <form onSubmit={addPhoto} className="flex gap-2 mt-2">
          <input
            className={inputCls + " flex-1"}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste photo URL..."
          />
          <button
            type="submit"
            disabled={loading || !urlInput.trim()}
            className="px-4 h-10 rounded-md text-white text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }}
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

type Tab = "overview" | "certifications" | "photos";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",       label: "Overview" },
  { id: "certifications", label: "Certifications" },
  { id: "photos",         label: "Photos" },
];

export function HandlerProfileClient({ handler, canEdit }: { handler: Handler; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");

  const expiredCount = handler.handlerCertifications.filter((c) => isExpired(c.expiresAt)).length;
  const expiringSoonCount = handler.handlerCertifications.filter(
    (c) => !isExpired(c.expiresAt) && isExpiringSoon(c.expiresAt)
  ).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex overflow-x-auto border-b border-border" style={{ scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-3 text-sm font-medium shrink-0 border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "certifications" && expiredCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {expiredCount}
              </span>
            )}
            {t.id === "certifications" && expiredCount === 0 && expiringSoonCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-white text-[9px] font-bold">
                {expiringSoonCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "overview"       && <OverviewTab       handler={handler} canEdit={canEdit} />}
        {tab === "certifications" && <CertificationsTab handler={handler} canEdit={canEdit} />}
        {tab === "photos"         && <PhotosTab         handler={handler} canEdit={canEdit} />}
      </div>
    </div>
  );
}
