import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export const metadata = { title: "Profile" };

export default async function FieldProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

  const [thisMonth, allTime] = await Promise.all([
    prisma.appointment.count({
      where: {
        organizationId: user.organizationId,
        technicianId: user.id,
        scheduledDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        status: { in: ["INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID"] },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: user.organizationId,
        technicianId: user.id,
        status: { in: ["INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID"] },
      },
    }),
  ]);

  return (
    <div className="px-4 pt-14 pb-6" style={{ background: "#0A0F1A", minHeight: "100vh" }}>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#0ABAB5" }}>
          Field Tech
        </div>
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-slate-400">{user.email}</div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: "#0ABAB5" }}>{user.role}</div>
          </div>
        </div>
        {org && (
          <div className="pt-3 border-t border-white/10 text-sm text-slate-400">
            {org.name}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(10,186,181,0.1)", border: "1px solid rgba(10,186,181,0.2)" }}>
          <div className="text-3xl font-black text-white">{thisMonth}</div>
          <div className="text-xs font-semibold mt-1" style={{ color: "#0ABAB5" }}>This Month</div>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-3xl font-black text-white">{allTime}</div>
          <div className="text-xs font-semibold mt-1 text-slate-400">All Time</div>
        </div>
      </div>

      {/* Switch to office view if not technician-only */}
      {user.role !== "TECHNICIAN" && (
        <Link
          href="/dashboard"
          className="flex items-center justify-between w-full rounded-2xl px-4 py-3.5 mb-3"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-sm font-semibold text-white">Switch to Office View</span>
          <span className="text-slate-400">→</span>
        </Link>
      )}

      {/* Sign out */}
      <div
        className="w-full rounded-2xl px-4 py-3.5 text-red-400 text-sm font-semibold text-center"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <SignOutButton>Sign Out</SignOutButton>
      </div>
    </div>
  );
}
