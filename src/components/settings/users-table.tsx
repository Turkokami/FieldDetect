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
}: {
  users: User[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

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

  return (
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
  );
}
