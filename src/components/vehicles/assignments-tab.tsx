"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Dog, Trash2, Plus, X } from "lucide-react";

type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
};

type K9Team = {
  id: string;
  name: string;
  dogs: { id: string; name: string }[];
};

type Assignment = {
  id: string;
  notes: string | null;
  createdAt: string | Date;
  user: StaffUser | null;
  k9Team: K9Team | null;
};

type Props = {
  vehicleId: string;
  initialAssignments: Assignment[];
  staffUsers: StaffUser[];
  k9Teams: K9Team[];
  canEdit: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  TECHNICIAN: "Technician",
};

export function AssignmentsTab({ vehicleId, initialAssignments, staffUsers, k9Teams, canEdit }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"user" | "team">("user");
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const assignedUserIds = new Set(assignments.filter((a) => a.user).map((a) => a.user!.id));
  const assignedTeamIds = new Set(assignments.filter((a) => a.k9Team).map((a) => a.k9Team!.id));

  const availableUsers = staffUsers.filter((u) => !assignedUserIds.has(u.id));
  const availableTeams = k9Teams.filter((t) => !assignedTeamIds.has(t.id));

  const handleAdd = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body = type === "user"
        ? { userId: selectedId, notes: notes || null }
        : { k9TeamId: selectedId, notes: notes || null };

      const res = await fetch(`/api/vehicles/${vehicleId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { data } = await res.json();
      setAssignments((prev) => [...prev, data]);
      setShowForm(false);
      setSelectedId("");
      setNotes("");
      toast.success("Assignment added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setRemoving(assignmentId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success("Assignment removed");
    } catch {
      toast.error("Failed to remove assignment");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignments.length === 0
            ? "No one assigned to this vehicle yet."
            : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
        </p>
        {canEdit && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 h-8 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Assign
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && canEdit && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add Assignment</h3>
            <button type="button" onClick={() => { setShowForm(false); setSelectedId(""); setNotes(""); }}>
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setType("user"); setSelectedId(""); }}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium border transition-colors ${type === "user" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Users className="h-3.5 w-3.5" /> Individual
            </button>
            <button
              type="button"
              onClick={() => { setType("team"); setSelectedId(""); }}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium border transition-colors ${type === "team" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Dog className="h-3.5 w-3.5" /> K9 Team
            </button>
          </div>

          {type === "user" ? (
            availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">All staff members are already assigned.</p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select staff member…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} — {ROLE_LABELS[u.role] ?? u.role}
                  </option>
                ))}
              </select>
            )
          ) : (
            availableTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">All K9 teams are already assigned.</p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select K9 team…</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.dogs.length > 0 ? ` — ${t.dogs.map((d) => d.name).join(", ")}` : ""}
                  </option>
                ))}
              </select>
            )
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Primary driver, Monday–Friday"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setSelectedId(""); setNotes(""); }}
              className="px-4 h-9 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !selectedId}
              className="px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Assignment"}
            </button>
          </div>
        </div>
      )}

      {/* Assignment list */}
      {assignments.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No assignments yet</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 h-8 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Assign someone
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                {a.user ? (
                  <>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {a.user.avatarUrl
                        ? <img src={a.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-semibold text-primary">{a.user.firstName[0]}{a.user.lastName[0]}</span>
                      }
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {a.user.firstName} {a.user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_LABELS[a.user.role] ?? a.user.role}
                        {a.notes && ` · ${a.notes}`}
                      </div>
                    </div>
                  </>
                ) : a.k9Team ? (
                  <>
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Dog className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{a.k9Team.name}</div>
                      <div className="text-xs text-muted-foreground">
                        K9 Team
                        {a.k9Team.dogs.length > 0 && ` · ${a.k9Team.dogs.map((d) => d.name).join(", ")}`}
                        {a.notes && ` · ${a.notes}`}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  disabled={removing === a.id}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 p-1"
                  title="Remove assignment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
