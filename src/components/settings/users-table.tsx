"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  TECHNICIAN: "Technician",
  CUSTOMER: "Customer",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  DISPATCHER: "bg-indigo-100 text-indigo-700",
  TECHNICIAN: "bg-green-100 text-green-700",
  CUSTOMER: "bg-gray-100 text-gray-700",
};

export default function UsersTable({
  users,
  currentUserId,
  canManage,
  pendingInvites = [],
}: {
  users: User[];
  currentUserId: string;
  canManage: boolean;
  pendingInvites?: PendingInvite[];
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "TECHNICIAN" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.refresh();
    } finally {
      setUpdating(null);
    }
  };

  const deactivate = async (userId: string) => {
    if (!confirm("Deactivate this user? They will lose access to the system.")) return;
    setUpdating(userId);
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      router.refresh();
    } finally {
      setUpdating(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invitation");
      setInviteSuccess(`Invitation sent to ${inviteForm.email}.`);
      setInviteForm({ email: "", role: "TECHNICIAN" });
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed");
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoke this invitation?")) return;
    setRevoking(id);
    try {
      await fetch(`/api/staff/invite/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRevoking(null);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40";

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => { setShowInvite(!showInvite); setInviteError(""); setInviteSuccess(""); }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#0ABAB5" }}
          >
            + Add Team Member
          </button>
        </div>
      )}

      {showInvite && canManage && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Team Member</h3>
          <form onSubmit={handleInvite} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              They'll receive an email with a link to create their account and join your team.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="technician@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                  className={inputClass}
                >
                  <option value="TECHNICIAN">Technician</option>
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#0ABAB5" }}
              >
                {inviting ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-amber-50/50">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Pending Invitations ({pendingInvites.length})
            </span>
          </div>
          <table className="w-full">
            <tbody>
              {pendingInvites.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-medium text-amber-600 shrink-0">
                        ?
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{inv.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                      Invited · {ROLE_LABELS[inv.role] ?? inv.role}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => revokeInvite(inv.id)}
                        disabled={revoking === inv.id}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                Email
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                Role
              </th>
              {canManage && (
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {u.firstName} {u.lastName}
                        {u.id === currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">{u.email}</td>
                <td className="px-5 py-3">
                  {canManage && u.id !== currentUserId && u.role !== "OWNER" ? (
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground focus:outline-none"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="DISPATCHER">Dispatcher</option>
                      <option value="TECHNICIAN">Technician</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  )}
                </td>
                {canManage && (
                  <td className="px-5 py-3 text-right">
                    {u.id !== currentUserId && u.role !== "OWNER" && (
                      <button
                        onClick={() => deactivate(u.id)}
                        disabled={updating === u.id}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
