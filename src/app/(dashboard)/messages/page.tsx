import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageSquare, CheckCircle2, Clock, MapPin } from "lucide-react";
import { MarkReadButton } from "@/components/messages/mark-read-button";

export const metadata = { title: "Field Messages" };

interface ParsedNote {
  timestamp: string;
  techName: string;
  message: string;
  raw: string;
}

function parseNotes(raw: string): ParsedNote[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[([^·\]]+)·\s*([^\]]+)\]\s(.+)$/);
      if (match) {
        return { timestamp: match[1].trim(), techName: match[2].trim(), message: match[3].trim(), raw: line };
      }
      return { timestamp: "", techName: "Field Tech", message: line, raw: line };
    })
    .reverse();
}

function isUnread(notes: string | null, readAt: Date | null, updatedAt: Date): boolean {
  if (!notes) return false;
  if (!readAt) return true;
  return updatedAt > readAt;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { filter = "all" } = await searchParams;

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      notes: { not: null },
    },
    select: {
      id: true,
      notes: true,
      officeNotesReadAt: true,
      updatedAt: true,
      scheduledDate: true,
      status: true,
      property: { select: { name: true, addressLine1: true, city: true } },
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      technician: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withUnread = appointments.map((a) => ({
    ...a,
    unread: isUnread(a.notes, a.officeNotesReadAt, a.updatedAt),
    parsed: parseNotes(a.notes ?? ""),
  }));

  const filtered = filter === "unread"
    ? withUnread.filter((a) => a.unread)
    : withUnread;

  const unreadCount = withUnread.filter((a) => a.unread).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Field Messages
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                style={{ background: "#dc2626" }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Messages from field technicians
          </p>
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { value: "all", label: `All (${withUnread.length})` },
            { value: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/messages?filter=${tab.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No messages</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread"
              ? "All messages have been read."
              : "Field technicians haven't sent any office notes yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const customerName = appt.customer.companyName
              ?? `${appt.customer.firstName} ${appt.customer.lastName}`;
            return (
              <div
                key={appt.id}
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${
                  appt.unread ? "border-primary/40" : "border-border"
                }`}
                style={appt.unread ? { boxShadow: "0 0 0 1px rgba(10,186,181,0.15)" } : undefined}
              >
                {/* Appointment meta bar */}
                <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b border-border ${
                  appt.unread ? "bg-primary/5" : "bg-muted/30"
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {appt.unread ? (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/scheduling/${appt.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {customerName}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{appt.property.name} · {appt.property.city}</span>
                        <span>·</span>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {new Date(appt.scheduledDate).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      appt.unread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {appt.parsed.length} note{appt.parsed.length !== 1 ? "s" : ""}
                    </span>
                    {appt.unread && <MarkReadButton appointmentId={appt.id} />}
                  </div>
                </div>

                {/* Note entries */}
                <div className="divide-y divide-border">
                  {appt.parsed.map((note, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">
                            {note.techName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-foreground">{note.techName}</span>
                            {note.timestamp && (
                              <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{note.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: link to appointment */}
                <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex justify-end">
                  <Link
                    href={`/scheduling/${appt.id}`}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    View appointment →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
