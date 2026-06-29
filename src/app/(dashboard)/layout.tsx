import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { computeBrandTokens, tokensToCSS } from "@/lib/brand-colors";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (user?.role === "TECHNICIAN") redirect("/field");
  if (user?.role === "CUSTOMER") redirect("/portal");

  const [org, unreadMessages] = await Promise.all([
    user
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { brandColor: true, secondaryColor: true, logoUrl: true, name: true },
        })
      : null,
    user
      ? prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM appointments
          WHERE organization_id = ${user.organizationId}
            AND notes IS NOT NULL
            AND (office_notes_read_at IS NULL OR office_notes_read_at < updated_at)
        `.then(([r]) => Number(r.count)).catch(() => 0)
      : 0,
  ]);

  const brand = (org as { brandColor?: string | null } | null)?.brandColor ?? "#0ABAB5";
  const secondary = (org as { secondaryColor?: string | null } | null)?.secondaryColor ?? null;
  const { light, dark } = computeBrandTokens(brand, secondary);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <style>{`body {\n${tokensToCSS(light)}\n}\n.dark body {\n${tokensToCSS(dark)}\n}`}</style>
      <Sidebar
        unreadMessages={unreadMessages as number}
        brandColor={brand}
        secondaryColor={secondary ?? brand}
        orgName={org?.name ?? undefined}
        orgLogoUrl={org?.logoUrl ?? undefined}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
