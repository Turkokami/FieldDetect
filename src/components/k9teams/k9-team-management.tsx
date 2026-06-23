"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamMember = {
  id: string;
  user: { id: string; firstName: string; lastName: string };
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  certificationNumber: string | null;
  certifiedUntil: string | Date | null;
  notes: string | null;
  isActive: boolean;
};

type Team = {
  id: string;
  name: string;
  isActive: boolean;
  members: TeamMember[];
  dogs: Dog[];
};

type Technician = {
  id: string;
  firstName: string;
  lastName: string;
};

type DogEditForm = {
  name: string;
  breed: string;
  certificationNumber: string;
  certifiedUntil: string;
  notes: string;
};

function certExpiryStatus(certifiedUntil: string | Date | null): "expired" | "expiring" | "valid" | null {
  if (!certifiedUntil) return null;
  const exp = new Date(certifiedUntil);
  const now = new Date();
  if (exp < now) return "expired";
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (exp < thirtyDays) return "expiring";
  return "valid";
}

export default function K9TeamManagement({
  team,
  allTechnicians,
}: {
  team: Team;
  allTechnicians: Technician[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddDog, setShowAddDog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingDogId, setEditingDogId] = useState<string | null>(null);
  const [confirmRemoveDog, setConfirmRemoveDog] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [dogForm, setDogForm] = useState<DogEditForm>({
    name: "",
    breed: "",
    certificationNumber: "",
    certifiedUntil: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState<DogEditForm>({
    name: "",
    breed: "",
    certificationNumber: "",
    certifiedUntil: "",
    notes: "",
  });

  const existingMemberIds = new Set(team.members.map((m) => m.user.id));
  const availableTechnicians = allTechnicians.filter((t) => !existingMemberIds.has(t.id));

  const doTeamAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      await fetch(`/api/k9teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!selectedUserId) return;
    await doTeamAction({ action: "add_member", userId: selectedUserId });
    setSelectedUserId("");
    setShowAddMember(false);
  };

  const removeMember = (userId: string) => doTeamAction({ action: "remove_member", userId });

  const addDog = async () => {
    if (!dogForm.name.trim()) return;
    await doTeamAction({
      action: "add_dog",
      dogName: dogForm.name,
      dogBreed: dogForm.breed || undefined,
      certificationNumber: dogForm.certificationNumber || undefined,
      certificationExpiry: dogForm.certifiedUntil
        ? new Date(dogForm.certifiedUntil).toISOString()
        : undefined,
    });
    setDogForm({ name: "", breed: "", certificationNumber: "", certifiedUntil: "", notes: "" });
    setShowAddDog(false);
  };

  const startEditDog = (dog: Dog) => {
    setEditForm({
      name: dog.name,
      breed: dog.breed ?? "",
      certificationNumber: dog.certificationNumber ?? "",
      certifiedUntil: dog.certifiedUntil
        ? (typeof dog.certifiedUntil === "string" ? dog.certifiedUntil : dog.certifiedUntil.toISOString()).split("T")[0]
        : "",
      notes: dog.notes ?? "",
    });
    setEditingDogId(dog.id);
  };

  const saveDog = async (dogId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/k9dogs/${dogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          breed: editForm.breed || null,
          certificationNumber: editForm.certificationNumber || null,
          certifiedUntil: editForm.certifiedUntil
            ? new Date(editForm.certifiedUntil).toISOString()
            : null,
          notes: editForm.notes || null,
        }),
      });
      setEditingDogId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const deactivateDog = async (dogId: string) => {
    setLoading(true);
    setConfirmRemoveDog(null);
    try {
      await fetch(`/api/k9dogs/${dogId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const renameTeam = async () => {
    if (!teamName.trim() || teamName === team.name) { setShowRename(false); return; }
    await doTeamAction({ name: teamName.trim() });
    setShowRename(false);
  };

  const deactivateTeam = async () => {
    await doTeamAction({ isActive: false });
    setConfirmDeactivate(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Manage Team</h2>

      {/* Rename Team */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Team Name</span>
          <button onClick={() => setShowRename(!showRename)} className="text-xs text-primary hover:underline">
            Rename
          </button>
        </div>
        {showRename ? (
          <div className="flex gap-2">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
            />
            <button
              onClick={renameTeam}
              disabled={loading || !teamName.trim()}
              className="px-3 h-9 bg-primary text-white rounded-md text-xs disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => { setShowRename(false); setTeamName(team.name); }} className="px-3 h-9 border border-border rounded-md text-xs text-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm text-foreground">{team.name}</p>
        )}
      </div>

      {/* Members */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Members</span>
          <button onClick={() => setShowAddMember(!showAddMember)} className="text-xs text-primary hover:underline">
            + Add
          </button>
        </div>
        {showAddMember && (
          <div className="flex gap-2 mb-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 h-9 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
            >
              <option value="">Select technician...</option>
              {availableTechnicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
            <button
              onClick={addMember}
              disabled={loading || !selectedUserId}
              className="px-3 h-9 bg-primary text-white rounded-md text-xs disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
        <div className="space-y-1">
          {team.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">
                {m.user.firstName} {m.user.lastName}
              </span>
              <button
                onClick={() => removeMember(m.user.id)}
                disabled={loading}
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dogs */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Dogs</span>
          <button onClick={() => setShowAddDog(!showAddDog)} className="text-xs text-primary hover:underline">
            + Add Dog
          </button>
        </div>

        {showAddDog && (
          <div className="space-y-2 mb-3 p-3 bg-muted/50 rounded-lg">
            <input
              value={dogForm.name}
              onChange={(e) => setDogForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Dog name *"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
            />
            <input
              value={dogForm.breed}
              onChange={(e) => setDogForm((f) => ({ ...f, breed: e.target.value }))}
              placeholder="Breed"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
            />
            <input
              value={dogForm.certificationNumber}
              onChange={(e) => setDogForm((f) => ({ ...f, certificationNumber: e.target.value }))}
              placeholder="Certification #"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
            />
            <div>
              <label className="text-xs text-muted-foreground">Cert Expiry</label>
              <input
                type="date"
                value={dogForm.certifiedUntil}
                onChange={(e) => setDogForm((f) => ({ ...f, certifiedUntil: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
              />
            </div>
            <button
              onClick={addDog}
              disabled={loading || !dogForm.name.trim()}
              className="w-full h-9 bg-primary text-white rounded-md text-xs font-medium disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Dog"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {team.dogs.filter((d) => d.isActive).map((dog) => {
            const expiry = certExpiryStatus(dog.certifiedUntil);
            if (editingDogId === dog.id) {
              return (
                <div key={dog.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Dog name *"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                  <input
                    value={editForm.breed}
                    onChange={(e) => setEditForm((f) => ({ ...f, breed: e.target.value }))}
                    placeholder="Breed"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                  <input
                    value={editForm.certificationNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, certificationNumber: e.target.value }))}
                    placeholder="Certification #"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                  <div>
                    <label className="text-xs text-muted-foreground">Cert Expiry</label>
                    <input
                      type="date"
                      value={editForm.certifiedUntil}
                      onChange={(e) => setEditForm((f) => ({ ...f, certifiedUntil: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <input
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveDog(dog.id)}
                      disabled={loading || !editForm.name.trim()}
                      className="flex-1 h-9 bg-primary text-white rounded-md text-xs font-medium disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingDogId(null)}
                      className="flex-1 h-9 border border-border rounded-md text-xs text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={dog.id} className="flex items-start justify-between py-1 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground">🐕 {dog.name}</span>
                    {expiry === "expired" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Cert Expired</span>
                    )}
                    {expiry === "expiring" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Expiring Soon</span>
                    )}
                  </div>
                  {dog.breed && <div className="text-xs text-muted-foreground">{dog.breed}</div>}
                  {dog.certificationNumber && (
                    <div className="text-xs text-muted-foreground">
                      Cert #{dog.certificationNumber}
                      {dog.certifiedUntil && (
                        <span className={expiry === "expired" ? " text-red-600" : expiry === "expiring" ? " text-yellow-600" : ""}>
                          {" "}· Exp {new Date(dog.certifiedUntil as string).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  {dog.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{dog.notes}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startEditDog(dog)}
                    disabled={loading}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  {confirmRemoveDog === dog.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deactivateDog(dog.id)}
                        disabled={loading}
                        className="text-xs text-destructive font-medium hover:underline"
                      >
                        Confirm
                      </button>
                      <button onClick={() => setConfirmRemoveDog(null)} className="text-xs text-muted-foreground hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveDog(dog.id)}
                      disabled={loading}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deactivate Team */}
      {team.isActive && (
        <div className="border-t border-border pt-4">
          {confirmDeactivate ? (
            <div className="p-3 bg-destructive/10 rounded-lg space-y-2">
              <p className="text-xs text-destructive font-medium">Deactivate this team? It will no longer appear in scheduling.</p>
              <div className="flex gap-2">
                <button
                  onClick={deactivateTeam}
                  disabled={loading}
                  className="flex-1 h-8 bg-destructive text-white rounded-md text-xs font-medium disabled:opacity-50"
                >
                  {loading ? "Deactivating..." : "Yes, Deactivate"}
                </button>
                <button
                  onClick={() => setConfirmDeactivate(false)}
                  className="flex-1 h-8 border border-border rounded-md text-xs text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeactivate(true)}
              className="text-xs text-destructive hover:underline"
            >
              Deactivate Team
            </button>
          )}
        </div>
      )}
    </div>
  );
}
