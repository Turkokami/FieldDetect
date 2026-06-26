"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { FeedingTab } from "@/components/k9teams/feeding-tab";
import { EquipmentTab } from "@/components/shared/equipment-tab";

// ─── Types from Prisma (serialized) ──────────────────────────────────────────

type Vaccination = {
  id: string;
  vaccineName: string;
  dateGiven: string | Date;
  nextDueDate: string | Date | null;
  administeredBy: string | null;
  batchNumber: string | null;
  notes: string | null;
};

type Certification = {
  id: string;
  name: string;
  certNumber: string | null;
  issuedBy: string | null;
  issueDate: string | Date | null;
  expiresAt: string | Date | null;
  notes: string | null;
};

type VetAppointment = {
  id: string;
  date: string | Date;
  vetName: string | null;
  clinic: string | null;
  reason: string;
  cost: string | number | null;
  notes: string | null;
  followUpNeeded: boolean;
  followUpDate: string | Date | null;
};

type GroomingAppointment = {
  id: string;
  date: string | Date;
  groomerName: string | null;
  services: string | null;
  cost: string | number | null;
  notes: string | null;
};

type InsurancePayment = {
  id: string;
  provider: string;
  policyNumber: string | null;
  amount: string | number;
  coverageType: string | null;
  dueDate: string | Date | null;
  paidDate: string | Date | null;
  notes: string | null;
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  certificationNumber: string | null;
  certifiedUntil: string | Date | null;
  notes: string | null;
  foodBrand: string | null;
  foodType: string | null;
  mannerisms: string | null;
  extras: string | null;
  vaccinations: Vaccination[];
  certifications: Certification[];
  vetAppointments: VetAppointment[];
  groomingAppointments: GroomingAppointment[];
  insurancePayments: InsurancePayment[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

function fmtCost(v: string | number | null | undefined) {
  if (v === null || v === undefined) return null;
  return `$${Number(v).toFixed(2)}`;
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

// ─── Shared UI ───────────────────────────────────────────────────────────────

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
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">{label}</div>
  );
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

// ─── Modals ──────────────────────────────────────────────────────────────────

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

// ─── Tab: Overview / Care ─────────────────────────────────────────────────────

function OverviewTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    foodBrand: dog.foodBrand ?? "",
    foodType: dog.foodType ?? "",
    mannerisms: dog.mannerisms ?? "",
    extras: dog.extras ?? "",
    notes: dog.notes ?? "",
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodBrand: form.foodBrand || null,
          foodType: form.foodType || null,
          mannerisms: form.mannerisms || null,
          extras: form.extras || null,
          notes: form.notes || null,
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
      <form onSubmit={save} className="space-y-4">
        <Field label="Food Brand">
          <input className={inputCls} value={form.foodBrand}
            onChange={(e) => setForm((f) => ({ ...f, foodBrand: e.target.value }))}
            placeholder="e.g. Royal Canin" />
        </Field>
        <Field label="Food Type">
          <select className={inputCls} value={form.foodType}
            onChange={(e) => setForm((f) => ({ ...f, foodType: e.target.value }))}>
            <option value="">— Select —</option>
            <option>Dry Kibble</option>
            <option>Wet / Canned</option>
            <option>Raw / BARF</option>
            <option>Freeze-Dried</option>
            <option>Mixed</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Mannerisms / Behavior Notes">
          <textarea className={textareaCls} rows={3} value={form.mannerisms}
            onChange={(e) => setForm((f) => ({ ...f, mannerisms: e.target.value }))}
            placeholder="Temperament, quirks, known triggers..." />
        </Field>
        <Field label="Extras (toys, preferences, other)">
          <textarea className={textareaCls} rows={3} value={form.extras}
            onChange={(e) => setForm((f) => ({ ...f, extras: e.target.value }))}
            placeholder="Favorite toys, feeding schedule, special needs..." />
        </Field>
        <Field label="General Notes">
          <textarea className={textareaCls} rows={2} value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Any other notes..." />
        </Field>
        <ModalActions onCancel={() => setEditing(false)} loading={loading} label="Save" />
      </form>
    );
  }

  const rows = [
    { label: "Food Brand", value: dog.foodBrand },
    { label: "Food Type", value: dog.foodType },
    { label: "Breed", value: dog.breed },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-sm text-foreground">{value || <span className="text-muted-foreground/60">—</span>}</div>
          </div>
        ))}
      </div>

      {dog.mannerisms && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Mannerisms / Behavior</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{dog.mannerisms}</p>
        </div>
      )}

      {dog.extras && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Extras</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{dog.extras}</p>
        </div>
      )}

      {dog.notes && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{dog.notes}</p>
        </div>
      )}

      {!dog.foodBrand && !dog.foodType && !dog.mannerisms && !dog.extras && !dog.notes && (
        <p className="text-sm text-muted-foreground">No care info recorded yet.</p>
      )}

      {canEdit && (
        <button onClick={() => setEditing(true)}
          className="text-sm font-medium transition-colors" style={{ color: "#0ABAB5" }}>
          Edit care info →
        </button>
      )}
    </div>
  );
}

// ─── Tab: Vaccinations ────────────────────────────────────────────────────────

function VaccinationsTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vaccineName: "", dateGiven: "", nextDueDate: "",
    administeredBy: "", batchNumber: "", notes: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}/vaccinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaccineName: form.vaccineName,
          dateGiven: form.dateGiven ? new Date(form.dateGiven).toISOString() : undefined,
          nextDueDate: form.nextDueDate ? new Date(form.nextDueDate).toISOString() : null,
          administeredBy: form.administeredBy || null,
          batchNumber: form.batchNumber || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ vaccineName: "", dateGiven: "", nextDueDate: "", administeredBy: "", batchNumber: "", notes: "" });
      toast.success("Vaccination added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/k9dogs/${dog.id}/vaccinations/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Vaccinations" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {dog.vaccinations.length === 0 ? (
        <EmptyState label="No vaccination records yet" />
      ) : (
        <div className="space-y-2">
          {dog.vaccinations.map((v) => {
            const due = v.nextDueDate;
            const dueBadge = isExpired(due)
              ? <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Overdue</span>
              : isExpiringSoon(due)
              ? <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Due Soon</span>
              : null;

            return (
              <div key={v.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{v.vaccineName}</span>
                    {dueBadge}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Given: {fmt(v.dateGiven)}
                    {v.nextDueDate && ` · Next due: ${fmt(v.nextDueDate)}`}
                  </div>
                  {v.administeredBy && (
                    <div className="text-xs text-muted-foreground">By: {v.administeredBy}</div>
                  )}
                  {v.batchNumber && (
                    <div className="text-xs text-muted-foreground">Batch: {v.batchNumber}</div>
                  )}
                  {v.notes && <div className="text-xs text-muted-foreground italic mt-1">{v.notes}</div>}
                </div>
                {canEdit && <DeleteBtn onDelete={() => del(v.id)} />}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Vaccination" onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Vaccine Name *">
              <input required className={inputCls} value={form.vaccineName}
                onChange={(e) => setForm((f) => ({ ...f, vaccineName: e.target.value }))}
                placeholder="e.g. Rabies, Distemper, Bordetella" />
            </Field>
            <Field label="Date Given *">
              <input required type="date" className={inputCls} value={form.dateGiven}
                onChange={(e) => setForm((f) => ({ ...f, dateGiven: e.target.value }))} />
            </Field>
            <Field label="Next Due Date">
              <input type="date" className={inputCls} value={form.nextDueDate}
                onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))} />
            </Field>
            <Field label="Administered By">
              <input className={inputCls} value={form.administeredBy}
                onChange={(e) => setForm((f) => ({ ...f, administeredBy: e.target.value }))}
                placeholder="Vet or clinic name" />
            </Field>
            <Field label="Batch / Lot Number">
              <input className={inputCls} value={form.batchNumber}
                onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} />
            </Field>
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

// ─── Tab: Certifications ──────────────────────────────────────────────────────

function CertificationsTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", certNumber: "", issuedBy: "", issueDate: "", expiresAt: "", notes: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          certNumber: form.certNumber || null,
          issuedBy: form.issuedBy || null,
          issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ name: "", certNumber: "", issuedBy: "", issueDate: "", expiresAt: "", notes: "" });
      toast.success("Certification added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/k9dogs/${dog.id}/certifications/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Certifications" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {dog.certificationNumber && (
        <div className="mb-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          Legacy cert: #{dog.certificationNumber}
          {dog.certifiedUntil && ` · expires ${fmt(dog.certifiedUntil)}`}
        </div>
      )}

      {dog.certifications.length === 0 && !dog.certificationNumber ? (
        <EmptyState label="No certifications recorded yet" />
      ) : (
        <div className="space-y-2">
          {dog.certifications.map((c) => {
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
                    {c.issueDate && `Issued: ${fmt(c.issueDate)}`}
                    {c.issueDate && c.expiresAt && " · "}
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
                placeholder="e.g. NAPCA, NNDDA, AKC Canine Good Citizen" />
            </Field>
            <Field label="Cert Number">
              <input className={inputCls} value={form.certNumber}
                onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))} />
            </Field>
            <Field label="Issued By">
              <input className={inputCls} value={form.issuedBy}
                onChange={(e) => setForm((f) => ({ ...f, issuedBy: e.target.value }))}
                placeholder="Certifying organization" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue Date">
                <input type="date" className={inputCls} value={form.issueDate}
                  onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
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

// ─── Tab: Vet Appointments ────────────────────────────────────────────────────

function VetTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: "", vetName: "", clinic: "", reason: "",
    cost: "", notes: "", followUpNeeded: false, followUpDate: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}/vet-appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date ? new Date(form.date).toISOString() : undefined,
          vetName: form.vetName || null,
          clinic: form.clinic || null,
          reason: form.reason,
          cost: form.cost ? parseFloat(form.cost) : null,
          notes: form.notes || null,
          followUpNeeded: form.followUpNeeded,
          followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ date: "", vetName: "", clinic: "", reason: "", cost: "", notes: "", followUpNeeded: false, followUpDate: "" });
      toast.success("Vet visit added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/k9dogs/${dog.id}/vet-appointments/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Vet Appointments" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {dog.vetAppointments.length === 0 ? (
        <EmptyState label="No vet appointments recorded yet" />
      ) : (
        <div className="space-y-2">
          {dog.vetAppointments.map((v) => (
            <div key={v.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{fmt(v.date)}</span>
                  {v.followUpNeeded && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Follow-Up</span>
                  )}
                </div>
                <div className="text-sm text-foreground mt-0.5">{v.reason}</div>
                {(v.vetName || v.clinic) && (
                  <div className="text-xs text-muted-foreground">
                    {[v.vetName, v.clinic].filter(Boolean).join(" · ")}
                  </div>
                )}
                {v.cost != null && (
                  <div className="text-xs text-muted-foreground">Cost: {fmtCost(v.cost)}</div>
                )}
                {v.followUpDate && (
                  <div className="text-xs text-muted-foreground">Follow-up: {fmt(v.followUpDate)}</div>
                )}
                {v.notes && <div className="text-xs text-muted-foreground italic mt-1">{v.notes}</div>}
              </div>
              {canEdit && <DeleteBtn onDelete={() => del(v.id)} />}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Vet Appointment" onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Date *">
              <input required type="date" className={inputCls} value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Reason / Purpose *">
              <input required className={inputCls} value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Annual exam, injury, sick visit" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vet Name">
                <input className={inputCls} value={form.vetName}
                  onChange={(e) => setForm((f) => ({ ...f, vetName: e.target.value }))} />
              </Field>
              <Field label="Clinic">
                <input className={inputCls} value={form.clinic}
                  onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))} />
              </Field>
            </div>
            <Field label="Cost ($)">
              <input type="number" step="0.01" min="0" className={inputCls} value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="followUp" checked={form.followUpNeeded}
                onChange={(e) => setForm((f) => ({ ...f, followUpNeeded: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50" />
              <label htmlFor="followUp" className="text-sm font-medium text-foreground">Follow-up needed</label>
            </div>
            {form.followUpNeeded && (
              <Field label="Follow-Up Date">
                <input type="date" className={inputCls} value={form.followUpDate}
                  onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </Field>
            )}
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

// ─── Tab: Grooming ────────────────────────────────────────────────────────────

function GroomingTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: "", groomerName: "", services: "", cost: "", notes: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}/grooming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date ? new Date(form.date).toISOString() : undefined,
          groomerName: form.groomerName || null,
          services: form.services || null,
          cost: form.cost ? parseFloat(form.cost) : null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ date: "", groomerName: "", services: "", cost: "", notes: "" });
      toast.success("Grooming appointment added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/k9dogs/${dog.id}/grooming/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Grooming" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {dog.groomingAppointments.length === 0 ? (
        <EmptyState label="No grooming appointments recorded yet" />
      ) : (
        <div className="space-y-2">
          {dog.groomingAppointments.map((g) => (
            <div key={g.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">{fmt(g.date)}</span>
                {g.groomerName && <div className="text-xs text-muted-foreground">Groomer: {g.groomerName}</div>}
                {g.services && <div className="text-sm text-foreground mt-0.5">{g.services}</div>}
                {g.cost != null && <div className="text-xs text-muted-foreground">Cost: {fmtCost(g.cost)}</div>}
                {g.notes && <div className="text-xs text-muted-foreground italic mt-1">{g.notes}</div>}
              </div>
              {canEdit && <DeleteBtn onDelete={() => del(g.id)} />}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Grooming Appointment" onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Date *">
              <input required type="date" className={inputCls} value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Groomer Name">
              <input className={inputCls} value={form.groomerName}
                onChange={(e) => setForm((f) => ({ ...f, groomerName: e.target.value }))} />
            </Field>
            <Field label="Services">
              <input className={inputCls} value={form.services}
                onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
                placeholder="e.g. Full groom, nail trim, bath" />
            </Field>
            <Field label="Cost ($)">
              <input type="number" step="0.01" min="0" className={inputCls} value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
            </Field>
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

// ─── Tab: Insurance ───────────────────────────────────────────────────────────

function InsuranceTab({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    provider: "", policyNumber: "", amount: "", coverageType: "",
    dueDate: "", paidDate: "", notes: "",
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/k9dogs/${dog.id}/insurance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          policyNumber: form.policyNumber || null,
          amount: parseFloat(form.amount),
          coverageType: form.coverageType || null,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          paidDate: form.paidDate ? new Date(form.paidDate).toISOString() : null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      setShowAdd(false);
      setForm({ provider: "", policyNumber: "", amount: "", coverageType: "", dueDate: "", paidDate: "", notes: "" });
      toast.success("Insurance record added");
      router.refresh();
    } finally { setLoading(false); }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/k9dogs/${dog.id}/insurance/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    router.refresh();
  };

  return (
    <div>
      <SectionHeader title="Insurance Payments" onAdd={() => setShowAdd(true)} canEdit={canEdit} />

      {dog.insurancePayments.length === 0 ? (
        <EmptyState label="No insurance records yet" />
      ) : (
        <div className="space-y-2">
          {dog.insurancePayments.map((ins) => {
            const unpaid = !ins.paidDate && ins.dueDate && isExpired(ins.dueDate);
            return (
              <div key={ins.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{ins.provider}</span>
                    <span className="text-sm font-medium" style={{ color: "#0ABAB5" }}>
                      ${Number(ins.amount).toFixed(2)}
                    </span>
                    {unpaid && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Overdue</span>
                    )}
                    {ins.paidDate && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Paid</span>
                    )}
                  </div>
                  {ins.policyNumber && <div className="text-xs text-muted-foreground">Policy: {ins.policyNumber}</div>}
                  {ins.coverageType && <div className="text-xs text-muted-foreground">Coverage: {ins.coverageType}</div>}
                  <div className="text-xs text-muted-foreground">
                    {ins.dueDate && `Due: ${fmt(ins.dueDate)}`}
                    {ins.dueDate && ins.paidDate && " · "}
                    {ins.paidDate && `Paid: ${fmt(ins.paidDate)}`}
                  </div>
                  {ins.notes && <div className="text-xs text-muted-foreground italic mt-1">{ins.notes}</div>}
                </div>
                {canEdit && <DeleteBtn onDelete={() => del(ins.id)} />}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Insurance Record" onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Provider *">
              <input required className={inputCls} value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. Trupanion, Healthy Paws, ASPCA" />
            </Field>
            <Field label="Policy Number">
              <input className={inputCls} value={form.policyNumber}
                onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))} />
            </Field>
            <Field label="Amount ($) *">
              <input required type="number" step="0.01" min="0" className={inputCls} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Coverage Type">
              <input className={inputCls} value={form.coverageType}
                onChange={(e) => setForm((f) => ({ ...f, coverageType: e.target.value }))}
                placeholder="e.g. Accident & Illness, Wellness" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due Date">
                <input type="date" className={inputCls} value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </Field>
              <Field label="Paid Date">
                <input type="date" className={inputCls} value={form.paidDate}
                  onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))} />
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

// ─── Root component ───────────────────────────────────────────────────────────

type Tab = "overview" | "certs" | "vaccinations" | "vet" | "grooming" | "insurance" | "feeding" | "equipment";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",    label: "Overview" },
  { id: "certs",       label: "Certifications" },
  { id: "vaccinations",label: "Vaccinations" },
  { id: "vet",         label: "Vet" },
  { id: "grooming",    label: "Grooming" },
  { id: "insurance",   label: "Insurance" },
  { id: "feeding",     label: "Feeding" },
  { id: "equipment",   label: "Equipment" },
];

export function DogProfileClient({ dog, canEdit }: { dog: Dog; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border" style={{ scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium shrink-0 border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "overview"    && <OverviewTab    dog={dog} canEdit={canEdit} />}
        {tab === "certs"       && <CertificationsTab dog={dog} canEdit={canEdit} />}
        {tab === "vaccinations"&& <VaccinationsTab dog={dog} canEdit={canEdit} />}
        {tab === "vet"         && <VetTab         dog={dog} canEdit={canEdit} />}
        {tab === "grooming"    && <GroomingTab     dog={dog} canEdit={canEdit} />}
        {tab === "insurance"   && <InsuranceTab    dog={dog} canEdit={canEdit} />}
        {tab === "feeding"     && <FeedingTab      dogId={dog.id} canEdit={canEdit} />}
        {tab === "equipment"   && <EquipmentTab    entityId={dog.id} entityType="dog" canEdit={canEdit} />}
      </div>
    </div>
  );
}
