import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfilePhotoUpload } from "@/components/team/profile-photo-upload";
import { HandlerProfileClient } from "@/components/team/handler-profile-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  return { title: user ? `${user.firstName} ${user.lastName} — Handler` : "Handler Profile" };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TECHNICIAN: "Technician",
  DISPATCHER: "Dispatcher",
};

export default async function HandlerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!currentUser) return null;

  const { id } = await params;

  const handler = await prisma.user.findFirst({
    where: { id, organizationId: currentUser.organizationId, isActive: true },
    include: {
      handlerCertifications: { orderBy: { expiresAt: "asc" } },
      _count: { select: { inspectionsPerformed: true } },
    },
  });

  if (!handler) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(currentUser.role) || currentUser.id === id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <ProfilePhotoUpload
          entityId={handler.id}
          entityType="user"
          currentPhotoUrl={handler.avatarUrl}
          displayName={`${handler.firstName} ${handler.lastName}`}
          canEdit={canEdit}
        />
        <div className="flex-1 min-w-0">
          <Link
            href="/team"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Team
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {handler.firstName} {handler.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5" }}
            >
              {ROLE_LABELS[handler.role] ?? handler.role}
            </span>
            <span className="text-xs text-muted-foreground">
              {handler._count.inspectionsPerformed} inspection{handler._count.inspectionsPerformed !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <HandlerProfileClient
        handler={JSON.parse(JSON.stringify(handler))}
        canEdit={canEdit}
      />
    </div>
  );
}
