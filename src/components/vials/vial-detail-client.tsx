"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ChevronLeft, FlaskConical, Pencil, Trash2, Plus, Clock } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:  { bg: "bg-green-100", text: "text-green-700",  label: "Active" },
  RETIRED: { bg: "bg-slate-100", text: "text-slate-500",  label: "Retired" },
  DEAD:    { bg: "bg-red-100",   text: "text-red-600",    label: "Dead" },
};

const HOST_LABELS: Record<string, string> = {
  HUMAN: "Human",
  PET:   "Pet",
  OTHER: "Other",
};

type FeedingLog = {
  id: string;
  fedAt: string;
  fedOn: string;
  fedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type Vial = {
  id: string;
  name: string;
  colony: string | null;
  source: string | null;
  acquisitionDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  feedingLogs: FeedingLog[];
  _count: { feedingLogs: number };
};

function relativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const hours = differenceInHours(new Date(), d);
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(new Date(), d);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return format(d, "MMM d, yyyy");
}

export function VialDetailClient({ vial: initial, canEdit }: { vial: Vial; canEdit: boolean }) {
  const router = useRouter();
  const [vial, setVial] = useState(initial);
  const [showAddFeeding, setShowAddFeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [feedForm, setFeedForm] = useState({
    fedAt: new Date().toISOString().slice(0, 16),
    fedOn: "HUMAN",
    fedBy: "",
    notes: "",
  });

  const status = STATUS_STYLES[vial.status] ?? STATUS_STYLES.ACTIVE;
  const lastFed = vial.feedingLogs[0];
  const daysSinceFed = lastFed ? differenceInDays(new Date(), new Date(lastFed.fedAt)) : null;
  const feedingOverdue = daysSinceFed === null || daysSinceFed >= 7;

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/vials/${vial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { toast.error("Failed to update status"); return; }
    toast.success("Status updated");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this vial and all feeding history? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vials/${vial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Vial deleted");
      router.push("/vials");
    } catch {
      toast.error("Failed to delete vial");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddFeeding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/vials/${vial.id}/feedings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fedAt: new Date(feedForm.fedAt).toISOString(),
          fedOn: feedForm.fedOn,
          fedBy: feedForm.fedBy || null,
          notes: feedForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setVial((prev) => ({
        ...prev,
        feedingLogs: [j.data, ...prev.feedingLogs],
        _count: { feedingLogs: prev._count.feedingLogs + 1 },
      }));
      setShowAddFeeding(false);
      setFeedForm({ fedAt: new Date().toISOString().slice(0, 16), fedOn: "HUMAN", fedBy: "", notes: "" });
      toast.success("Feeding logged");
    } catch {
      toast.error("Failed to log feeding");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeeding = async (feedingId: string) => {
    if (!confirm("Remove this feeding entry?")) return;
    const res = await fetch(`/api/vials/${vial.id}/feedings?feedingId=${feedingId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setVial((prev) => ({
      ...prev,
      feedingLogs: prev.feedingLogs.filter((f) => f.id !== feedingId),
      _count: { feedingLogs: prev._count.feedingLogs - 1 },
    }));
    toast.success("Removed");
  };

  const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/vials" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Vial Tracker
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{vial.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${feedingOverdue ? "bg-amber-100" : "bg-primary/10"}`}>
            <FlaskConical className={`h-7 w-7 ${feedingOverdue ? "text-amber-600" : "text-primary"}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vial.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {vial.colony && <span className="text-sm text-muted-foreground">{vial.colony}</span>}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            {vial.status !== "ACTIVE" && (
              <button onClick={() => handleStatusChange("ACTIVE")} className="px-3 h-8 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 transition-colors">
                Mark Active
              </button>
            )}
            {vial.status === "ACTIVE" && (
              <button onClick={() => handleStatusChange("RETIRED")} className="px-3 h-8 bg-slate-100 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-200 transition-colors">
                Retire
              </button>
            )}
            {vial.status !== "DEAD" && (
              <button onClick={() => handleStatusChange("DEAD")} className="px-3 h-8 bg-red-100 text-red-600 rounded-md text-xs font-medium hover:bg-red-200 transition-colors">
                Mark Dead
              </button>
            )}
            <Link href={`/vials/${vial.id}/edit`} className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="h-3 w-3" /> Edit
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className={`text-lg font-bold ${feedingOverdue ? "text-amber-600" : "text-foreground"}`}>
            {daysSinceFed === null ? "—" : daysSinceFed === 0 ? "Today" : `${daysSinceFed}d`}
          </div>
          <div className="text-xs text-muted-foreground">Since Last Fed</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">{vial._count.feedingLogs}</div>
          <div className="text-xs text-muted-foreground">Total Feedings</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">
            {differenceInDays(new Date(), new Date(vial.acquisitionDate))}d
          </div>
          <div className="text-xs text-muted-foreground">Days in Service</div>
        </div>
        {vial.source && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <div className="text-lg font-bold text-foreground truncate max-w-[120px]">{vial.source}</div>
            <div className="text-xs text-muted-foreground">Source</div>
          </div>
        )}
      </div>

      {/* Overdue warning */}
      {feedingOverdue && vial.status === "ACTIVE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            {daysSinceFed === null ? "This vial has never been fed." : `Feeding overdue — ${daysSinceFed} day${daysSinceFed !== 1 ? "s" : ""} since last feeding.`}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">Bed bugs should be fed every 5–7 days for optimal training performance.</p>
        </div>
      )}

      {/* Feeding log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Feeding Log</h2>
          {canEdit && vial.status === "ACTIVE" && (
            <button
              onClick={() => setShowAddFeeding((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Feeding
            </button>
          )}
        </div>

        {showAddFeeding && (
          <form onSubmit={handleAddFeeding} className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date &amp; Time *</label>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={feedForm.fedAt}
                  onChange={(e) => setFeedForm((p) => ({ ...p, fedAt: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Fed On *</label>
                <select
                  className={inputCls}
                  value={feedForm.fedOn}
                  onChange={(e) => setFeedForm((p) => ({ ...p, fedOn: e.target.value }))}
                >
                  <option value="HUMAN">Human</option>
                  <option value="PET">Pet</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fed By (person)</label>
                <input
                  className={inputCls}
                  value={feedForm.fedBy}
                  onChange={(e) => setFeedForm((p) => ({ ...p, fedBy: e.target.value }))}
                  placeholder="Name of handler"
                />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input
                  className={inputCls}
                  value={feedForm.notes}
                  onChange={(e) => setFeedForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any observations..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className="px-4 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save Feeding"}
              </button>
              <button type="button" onClick={() => setShowAddFeeding(false)} className="px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {vial.feedingLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No feedings logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {vial.feedingLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-start justify-between p-4 rounded-xl border bg-card text-sm ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {format(new Date(log.fedAt), "MMM d, yyyy · h:mm a")}
                    </span>
                    {i === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Latest</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fed on: <span className="font-medium text-foreground">{HOST_LABELS[log.fedOn] ?? log.fedOn}</span>
                    {log.fedBy && <> · By: <span className="font-medium text-foreground">{log.fedBy}</span></>}
                    {" · "}<span className="italic">{relativeTime(log.fedAt)}</span>
                  </div>
                  {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteFeeding(log.id)}
                    className="ml-4 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vial info */}
      {vial.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground">{vial.notes}</p>
        </div>
      )}
    </div>
  );
}
