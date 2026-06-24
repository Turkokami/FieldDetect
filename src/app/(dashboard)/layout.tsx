import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

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

  const unreadMessages = user
    ? await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM appointments
        WHERE organization_id = ${user.organizationId}
          AND notes IS NOT NULL
          AND (office_notes_read_at IS NULL OR office_notes_read_at < updated_at)
      `.then(([r]) => Number(r.count)).catch(() => 0)
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar unreadMessages={unreadMessages} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
