import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsForm from "@/components/settings/settings-form";
import UsersTable from "@/components/settings/users-table";
import NotificationTemplates from "@/components/settings/notification-templates";
import BillingSection from "@/components/settings/billing-section";
import BookingLinkCard from "@/components/settings/booking-link-card";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const sp = await searchParams;

  const [org, users, templates, pendingInvites] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
    prisma.notificationTemplate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    }),
    prisma.staffInvitation.findMany({
      where: {
        organizationId: user.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
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

      {sp.billing === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
          ✅ Subscription activated! Your plan is now live.
        </div>
      )}

      {/* Organization Settings */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Organization</h2>
        <SettingsForm org={org} canEdit={canEdit} />
      </div>

      {/* Booking Link */}
      {canEdit && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Booking Page</h2>
          <BookingLinkCard slug={org.slug} />
        </div>
      )}

      {/* Billing */}
      {canEdit && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Billing & Plan</h2>
          <BillingSection
            plan={org.plan}
            stripeSubStatus={org.stripeSubStatus}
            hasStripeCustomer={!!org.stripeCustomerId}
          />
        </div>
      )}

      {/* Team Members */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Team Members</h2>
        <UsersTable
          users={JSON.parse(JSON.stringify(users))}
          currentUserId={user.id}
          canManage={canEdit}
          pendingInvites={JSON.parse(JSON.stringify(pendingInvites))}
        />
      </div>

      {/* Notification Templates */}
      {canEdit && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Notification Templates</h2>
          <NotificationTemplates initialTemplates={JSON.parse(JSON.stringify(templates))} />
        </div>
      )}
    </div>
  );
}
