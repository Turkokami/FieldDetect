import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfilePhotoUpload } from "@/components/team/profile-photo-upload";
import { DogProfileClient } from "@/components/k9teams/dog-profile-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dog = await prisma.k9Dog.findUnique({ where: { id }, select: { name: true } });
  return { title: dog ? `${dog.name} — Profile` : "Dog Profile" };
}

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;

  const dog = await prisma.k9Dog.findFirst({
    where: { id, k9Team: { organizationId: user.organizationId } },
    include: {
      k9Team: { select: { id: true, name: true } },
      vaccinations: { orderBy: { dateGiven: "desc" } },
      certifications: { orderBy: { expiresAt: "asc" } },
      vetAppointments: { orderBy: { date: "desc" } },
      groomingAppointments: { orderBy: { date: "desc" } },
      insurancePayments: { orderBy: { createdAt: "desc" } },
      _count: { select: { inspections: true } },
    },
  });

  if (!dog) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <ProfilePhotoUpload
          entityId={dog.id}
          entityType="dog"
          currentPhotoUrl={dog.photoUrl}
          displayName={dog.name}
          canEdit={canEdit}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/k9teams/${dog.k9Team.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {dog.k9Team.name}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">{dog.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {dog.breed && (
              <span className="text-sm text-muted-foreground">{dog.breed}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {dog._count.inspections} inspection{dog._count.inspections !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <DogProfileClient dog={JSON.parse(JSON.stringify(dog))} canEdit={canEdit} />
    </div>
  );
}
