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
  isActive: boolean;
};

type Team = {
  id: string;
  members: TeamMember[];
  dogs: Dog[];
};

type Technician = {
  id: string;
  firstName: string;
  lastName: string;
};

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
  const [dogForm, setDogForm] = useState({
    name: "",
    breed: "",
    certificationNumber: "",
    certificationExpiry: "",
  });

  const existingMemberIds = new Set(team.members.map((m) => m.user.id));
  const availableTechnicians = allTechnicians.filter((t) => !existingMemberIds.has(t.id));

  const doAction = async (body: Record<string, unknown>) => {
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
    await doAction({ action: "add_member", userId: selectedUserId });
    setSelectedUserId("");
    setShowAddMember(false);
  };

  const removeMember = (userId: string) => doAction({ action: "remove_member", userId });

  const addDog = async () => {
    if (!dogForm.name.trim()) return;
    await doAction({
      action: "add_dog",
      dogName: dogForm.name,
      dogBreed: dogForm.breed || undefined,
      certificationNumber: dogForm.certificationNumber || undefined,
      certificationExpiry: dogForm.certificationExpiry
        ? new Date(dogForm.certificationExpiry).toISOString()
        : undefined,
    });
    setDogForm({ name: "", breed: "", certificationNumber: "", certificationExpiry: "" });
    setShowAddDog(false);
  };

  const removeDog = (dogId: string) => doAction({ action: "remove_dog", dogId });

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Manage Team</h2>

      {/* Add Member */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Members</span>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="text-xs text-primary hover:underline"
          >
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

      {/* Add Dog */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Dogs</span>
          <button
            onClick={() => setShowAddDog(!showAddDog)}
            className="text-xs text-primary hover:underline"
          >
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
                value={dogForm.certificationExpiry}
                onChange={(e) => setDogForm((f) => ({ ...f, certificationExpiry: e.target.value }))}
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
        <div className="space-y-1">
          {team.dogs.filter((d) => d.isActive).map((dog) => (
            <div key={dog.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">🐕 {dog.name}</span>
              <button
                onClick={() => removeDog(dog.id)}
                disabled={loading}
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
