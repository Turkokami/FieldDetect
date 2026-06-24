import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import K9TeamManagement from "@/components/k9teams/k9-team-management";

function certExpiryBadge(certifiedUntil: Date | null) {
  if (!certifiedUntil) return null;
  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  if (certifiedUntil < now) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Cert Expired</span>;
  }
  if (certifiedUntil < thirtyDays) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Expiring Soon</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Certified</span>;
}

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
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, role: true, phone: true } },
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
    NEGATIVE: "bg-green-100 text-green-700",
    POSITIVE_K9_ALERT: "bg-red-100 text-red-700",
    VISUAL_CONFIRMATION: "bg-red-100 text-red-600",
    INCONCLUSIVE: "bg-yellow-100 text-yellow-700",
  };

  const ROLE_LABELS: Record<string, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    TECHNICIAN: "Technician",
    OFFICE: "Office",
  };

  const activeDogs = team.dogs.filter((d) => d.isActive);
  const expiredCerts = activeDogs.filter((d) => d.certifiedUntil && d.certifiedUntil < new Date());
  const expiringSoon = activeDogs.filter((d) => {
    if (!d.certifiedUntil || d.certifiedUntil < new Date()) return false;
    const thirty = new Date(); thirty.setDate(thirty.getDate() + 30);
    return d.certifiedUntil < thirty;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/k9teams" className="text-muted-foreground hover:text-foreground text-sm">
            ← K9 Teams
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {!team.isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Inactive</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{team._count.appointments}</div>
          <div className="text-xs text-muted-foreground">total jobs</div>
        </div>
      </div>

      {/* Compliance warnings */}
      {(expiredCerts.length > 0 || expiringSoon.length > 0) && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-1">
          <div className="text-sm font-semibold text-yellow-800">Certification Alert</div>
          {expiredCerts.map((d) => (
            <div key={d.id} className="text-sm text-red-700">
              🐕 {d.name} — certification expired {d.certifiedUntil ? formatDate(d.certifiedUntil) : ""}
            </div>
          ))}
          {expiringSoon.map((d) => (
            <div key={d.id} className="text-sm text-yellow-700">
              🐕 {d.name} — certification expires {d.certifiedUntil ? formatDate(d.certifiedUntil) : ""}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {/* Team Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Team Info
            </h2>
            {team.notes && (
              <p className="text-sm text-foreground mb-3">{team.notes}</p>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created {formatDate(team.createdAt)}</div>
              <div>{activeDogs.length} dog{activeDogs.length !== 1 ? "s" : ""} · {team.members.length} member{team.members.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* K9 Dog Profiles */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              K9 Dogs
            </h2>
            {activeDogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dogs assigned</p>
            ) : (
              <div className="space-y-4">
                {activeDogs.map((dog) => (
                  <div key={dog.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
                        🐕
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-foreground text-sm">{dog.name}</span>
                          {certExpiryBadge(dog.certifiedUntil)}
                        </div>
                        {dog.breed && (
                          <div className="text-xs text-muted-foreground">{dog.breed}</div>
                        )}
                        {dog.certificationNumber && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Cert #</span>{dog.certificationNumber}
                          </div>
                        )}
                        {dog.certifiedUntil && (
                          <div className={`text-xs mt-0.5 ${dog.certifiedUntil < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            Expires {formatDate(dog.certifiedUntil)}
                          </div>
                        )}
                        {dog.notes && (
                          <div className="text-xs text-muted-foreground italic mt-1 border-t border-border/50 pt-1">{dog.notes}</div>
                        )}
                        <Link href={`/k9teams/dogs/${dog.id}`}
                          className="text-xs mt-2 block transition-colors" style={{ color: "#0ABAB5" }}>
                          Full profile →
                        </Link>
                      </div>
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
          {/* Team Member Profiles */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Team Members ({team.members.length})
            </h2>
            {team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 overflow-hidden">
                      {member.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>{member.user.firstName[0]}{member.user.lastName[0]}</>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {member.user.firstName} {member.user.lastName}
                        </span>
                        {member.user.role && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {ROLE_LABELS[member.user.role] ?? member.user.role}
                          </span>
                        )}
                      </div>
                      {member.user.email && (
                        <a
                          href={`mailto:${member.user.email}`}
                          className="text-xs text-primary hover:underline truncate block"
                        >
                          {member.user.email}
                        </a>
                      )}
                      {member.user.phone && (
                        <a href={`tel:${member.user.phone}`} className="text-xs text-muted-foreground hover:underline">
                          {member.user.phone}
                        </a>
                      )}
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
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_COLORS[appt.inspection.overallResult] ?? "bg-muted text-muted-foreground"}`}>
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
