import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsForm from "@/components/settings/settings-form";
import UsersTable from "@/components/settings/users-table";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const [org, users] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!org) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization settings and team members.
        </p>
      </div>

      {/* Organization Settings */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Organization</h2>
        <SettingsForm org={org} canEdit={canEdit} />
      </div>

      {/* Team Members */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Team Members</h2>
        <UsersTable users={users} currentUserId={user.id} canManage={canEdit} />
      </div>
    </div>
  );
}
