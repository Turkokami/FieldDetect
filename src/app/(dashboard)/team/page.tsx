import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfilePhotoUpload } from "@/components/team/profile-photo-upload";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

export const metadata = { title: "Team" };

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TECHNICIAN: "Technician",
  DISPATCHER: "Dispatcher",
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
        createdAt: true,
        _count: { select: { inspectionsPerformed: true } },
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Handlers, staff, and K9 partners</p>
      </div>

      {/* Team Members */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Team Members
          <span className="ml-2 text-sm font-normal text-muted-foreground">({members.length})</span>
        </h2>

        {members.length === 0 ? (
          <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
            No team members yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                <ProfilePhotoUpload
                  entityId={m.id}
                  entityType="user"
                  currentPhotoUrl={m.avatarUrl}
                  displayName={`${m.firstName} ${m.lastName}`}
                  canEdit={canEdit || currentUser.id === m.id}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">
                    {m.firstName} {m.lastName}
                    {m.id === currentUser.id && (
                      <span className="ml-1.5 text-[10px] font-medium text-primary">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5" }}
                    >
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 truncate">{m.email}</div>
                  {m.phone && (
                    <div className="text-xs text-muted-foreground truncate">{m.phone}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1.5">
                    {m._count.inspectionsPerformed} inspection{m._count.inspectionsPerformed !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* K9 Dogs */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">
          K9 Dogs
          <span className="ml-2 text-sm font-normal text-muted-foreground">({dogs.length})</span>
        </h2>

        {dogs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
            No K9 dogs yet — add them in K9 Teams
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dogs.map((dog) => (
              <div key={dog.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                <ProfilePhotoUpload
                  entityId={dog.id}
                  entityType="dog"
                  currentPhotoUrl={dog.photoUrl}
                  displayName={dog.name}
                  canEdit={canEdit}
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/k9teams/dogs/${dog.id}`}
                    className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                    {dog.name}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">{dog.teamName}</div>
                  {dog.breed && (
                    <div className="text-xs text-muted-foreground">{dog.breed}</div>
                  )}
                  {dog.certificationNumber && (
                    <div className="text-xs text-muted-foreground mt-1.5">
                      Cert #{dog.certificationNumber}
                    </div>
                  )}
                  {dog.certifiedUntil && (
                    <div className="text-xs mt-1">
                      <span className={
                        new Date(dog.certifiedUntil) < new Date()
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }>
                        Exp: {format(new Date(dog.certifiedUntil), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <Link href={`/k9teams/dogs/${dog.id}`}
                    className="text-xs mt-2 block transition-colors" style={{ color: "#0ABAB5" }}>
                    View profile →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
