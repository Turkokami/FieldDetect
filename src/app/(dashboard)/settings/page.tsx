import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SettingsForm from "@/components/settings/settings-form";
import UsersTable from "@/components/settings/users-table";
import NotificationTemplates from "@/components/settings/notification-templates";
import BillingSection from "@/components/settings/billing-section";
import BookingLinkCard from "@/components/settings/booking-link-card";
import BrandingSection from "@/components/settings/branding-section";
import TaxCodesSection from "@/components/settings/tax-codes-section";
import EquipmentItemsSection from "@/components/settings/equipment-items-section";
import PPERequirementsSection from "@/components/settings/ppe-requirements-section";

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

  const [org, users, templates, pendingInvites, taxCodes, equipmentItems, ppeRequirements] = await Promise.all([
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
    prisma.taxCode.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isDefault: "desc" }, { state: "asc" }, { city: "asc" }, { name: "asc" }],
    }),
    prisma.equipmentItem.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.facilityPPERequirement.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ facilityType: "asc" }, { sortOrder: "asc" }],
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

      {/* Branding */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Branding</h2>
        <p className="text-sm text-muted-foreground mb-4">Logo and brand color used across invoices, emails, and reports.</p>
        <BrandingSection
          logoUrl={org.logoUrl}
          brandColor={(org as { brandColor?: string | null }).brandColor ?? null}
          canEdit={canEdit}
        />
      </div>

      {/* Tax Codes */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Tax Codes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define tax rates by city or state. When creating an invoice, the matching code is auto-applied based on the property location.
        </p>
        <TaxCodesSection
          initialTaxCodes={JSON.parse(JSON.stringify(taxCodes))}
          canEdit={canEdit}
        />
      </div>

      {/* Equipment Items */}
      {canEdit && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Equipment & Gear Checklist</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Define the equipment items that dogs and handlers should check out before field work and return afterward.
          </p>
          <EquipmentItemsSection initialItems={JSON.parse(JSON.stringify(equipmentItems))} />
        </div>
      )}

      {/* PPE Requirements */}
      {canEdit && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">PPE Requirements by Facility</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set required PPE for handlers and dogs based on facility type. Reminders appear on the calendar day view.
          </p>
          <PPERequirementsSection initialItems={JSON.parse(JSON.stringify(ppeRequirements))} />
        </div>
      )}

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
