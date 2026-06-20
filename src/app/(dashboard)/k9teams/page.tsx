import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function K9TeamsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const teams = await prisma.k9Team.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      dogs: { where: { isActive: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">K9 Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">{teams.length} active teams</p>
        </div>
        {["OWNER", "ADMIN"].includes(user.role) && (
          <Link
            href="/k9teams/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + New Team
          </Link>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">🐕</div>
          <p className="font-medium">No K9 teams yet</p>
          <p className="text-sm mt-1">Create a team to assign to appointments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/k9teams/${team.id}`}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{team._count.appointments}</div>
                  <div className="text-xs text-muted-foreground">jobs</div>
                </div>
              </div>

              {/* Dogs */}
              {team.dogs.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {team.dogs.map((dog) => (
                      <span
                        key={dog.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium"
                      >
                        🐕 {dog.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map((member) => (
                    <div
                      key={member.id}
                      className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium text-primary"
                      title={`${member.user.firstName} ${member.user.lastName}`}
                    >
                      {member.user.firstName[0]}{member.user.lastName[0]}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {team.members.length} {team.members.length === 1 ? "handler" : "handlers"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
