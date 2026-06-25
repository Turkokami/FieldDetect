import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ProfilePhotoUpload } from "@/components/team/profile-photo-upload";
import { TeamTabs } from "@/components/team/team-tabs";

export const metadata = { title: "Team" };

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TECHNICIAN: "Technician",
  DISPATCHER: "Dispatcher",
};

const SPECIALTY_LABELS: Record<string, string> = {
  bed_bug: "Bed Bug",
  rodent: "Rodent",
  goose: "Goose",
  termite: "Termite",
  general: "General Pest",
  narcotics: "Narcotics",
  explosives: "Explosives",
  search_rescue: "Search & Rescue",
};

export default async function TeamPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!currentUser) redirect("/onboarding");

  const canEdit = ["OWNER", "ADMIN"].includes(currentUser.role);

  const [members, k9teams] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: currentUser.organizationId, isActive: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        specialties: true,
        handlerNotes: true,
        createdAt: true,
        _count: { select: { inspectionsPerformed: true } },
        handlerCertifications: {
          select: { id: true, name: true, expiresAt: true },
          orderBy: { expiresAt: "asc" },
        },
      },
    }),
    prisma.k9Team.findMany({
      where: { organizationId: currentUser.organizationId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        dogs: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            breed: true,
            certificationNumber: true,
            certifiedUntil: true,
            photoUrl: true,
          },
        },
      },
    }),
  ]);

  const dogs = k9teams.flatMap((t) => t.dogs.map((d) => ({ ...d, teamName: t.name })));

  const handlersData = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    phone: m.phone,
    role: m.role,
    roleLabel: ROLE_LABELS[m.role] ?? m.role,
    avatarUrl: m.avatarUrl,
    specialties: m.specialties,
    specialtyLabels: m.specialties.map((s) => SPECIALTY_LABELS[s] ?? s),
    handlerNotes: m.handlerNotes,
    inspectionCount: m._count.inspectionsPerformed,
    certifications: m.handlerCertifications.map((c) => ({
      ...c,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    })),
    isSelf: m.id === currentUser.id,
  }));

  const dogsData = dogs.map((d) => ({
    id: d.id,
    name: d.name,
    breed: d.breed,
    certificationNumber: d.certificationNumber,
    certifiedUntil: d.certifiedUntil ? d.certifiedUntil.toISOString() : null,
    photoUrl: d.photoUrl,
    teamName: d.teamName,
  }));

  return (
    <TeamTabs
      handlers={handlersData}
      dogs={dogsData}
      canEdit={canEdit}
      currentUserId={currentUser.id}
    />
  );
}
