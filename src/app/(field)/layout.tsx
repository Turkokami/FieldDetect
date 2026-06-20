import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0A0F1A", color: "#f1f5f9" }}
    >
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>
      {/* Bottom nav */}
      <FieldBottomNav />
    </div>
  );
}

function FieldBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: "linear-gradient(0deg, #0A0F1A 80%, transparent)",
        borderTop: "1px solid rgba(10,186,181,0.15)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        paddingTop: "12px",
      }}
    >
      <FieldNavItem href="/field" icon="🗓️" label="Jobs" />
      <FieldNavItem href="/field/history" icon="📋" label="History" />
      <FieldNavItem href="/field/profile" icon="👤" label="Profile" />
    </nav>
  );
}

function FieldNavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition-colors"
      style={{ color: "#94a3b8" }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </a>
  );
}
