import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import K9TeamManagement from "@/components/k9teams/k9-team-management";

export default async function K9TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const team = await prisma.k9Team.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
        },
      },
      dogs: true,
      appointments: {
        include: {
          customer: { select: { firstName: true, lastName: true } },
          property: { select: { name: true, addressLine1: true } },
          inspection: { select: { id: true, overallResult: true } },
        },
        orderBy: { scheduledDate: "desc" },
        take: 10,
      },
      _count: { select: { appointments: true } },
    },
  });

  if (!team) notFound();

  const allTechnicians = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] },
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true },
  });

  const canManage = ["OWNER", "ADMIN"].includes(user.role);

  const RESULT_COLORS: Record<string, string> = {
    NEGATIVE: "text-green-700",
    POSITIVE_K9_ALERT: "text-red-700",
    VISUAL_CONFIRMATION: "text-red-600",
    INCONCLUSIVE: "text-yellow-700",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/k9teams" className="text-muted-foreground hover:text-foreground text-sm">
            ← K9 Teams
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{team._count.appointments}</div>
          <div className="text-xs text-muted-foreground">total jobs</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {/* Team Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Team Info
            </h2>
            {team.notes && (
              <p className="text-sm text-foreground mb-4">{team.notes}</p>
            )}
            <div className="text-xs text-muted-foreground">
              Created {formatDate(team.createdAt)}
            </div>
          </div>

          {/* Dogs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              K9 Dogs
            </h2>
            {team.dogs.filter((d) => d.isActive).length === 0 ? (
              <p className="text-sm text-muted-foreground">No dogs assigned</p>
            ) : (
              <div className="space-y-3">
                {team.dogs.filter((d) => d.isActive).map((dog) => (
                  <div key={dog.id} className="flex items-start gap-3">
                    <div className="text-2xl">🐕</div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{dog.name}</div>
                      {dog.breed && <div className="text-xs text-muted-foreground">{dog.breed}</div>}
                      {dog.certificationNumber && (
                        <div className="text-xs text-muted-foreground">
                          Cert #{dog.certificationNumber}
                          {dog.certifiedUntil && (
                            <> · Exp {formatDate(dog.certifiedUntil)}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <K9TeamManagement team={team} allTechnicians={allTechnicians} />
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Members */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Team Members ({team.members.length})
            </h2>
            {team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned</p>
            ) : (
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {member.user.firstName[0]}{member.user.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {member.user.firstName} {member.user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Recent Jobs
            </h2>
            {team.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments yet</p>
            ) : (
              <div className="space-y-2">
                {team.appointments.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/scheduling/${appt.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {appt.property?.name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appt.customer?.firstName} {appt.customer?.lastName} · {formatDate(appt.scheduledDate)}
                      </div>
                    </div>
                    {appt.inspection?.overallResult && (
                      <span className={`text-xs font-medium ${RESULT_COLORS[appt.inspection.overallResult] ?? "text-muted-foreground"}`}>
                        {appt.inspection.overallResult.replace(/_/g, " ")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
