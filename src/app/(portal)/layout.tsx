import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { FileText, Receipt, LayoutDashboard } from "lucide-react";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({
    where: { clerkUserId: userId },
    include: { organization: true },
  });

  if (!customer) redirect("/dashboard");

  const org = customer.organization;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="h-14 shrink-0 flex items-center px-5 gap-4 shadow-sm"
        style={{ background: "linear-gradient(180deg, #0A0F1A 0%, #0D1A1F 100%)", borderBottom: "1px solid rgba(10,186,181,0.15)" }}
      >
        <div className="flex items-center gap-2.5 mr-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white text-sm">🐾</span>
          </div>
          <div>
            <div className="font-bold text-white text-sm">{org.name}</div>
            <div className="text-xs" style={{ color: "#0ABAB5" }}>Customer Portal</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          <Link
            href="/portal"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Overview
          </Link>
          <Link
            href="/portal/reports"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Reports
          </Link>
          <Link
            href="/portal/invoices"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Receipt className="h-3.5 w-3.5" />
            Invoices
          </Link>
        </nav>

        <div className="ml-auto">
          <UserButton
            appearance={{
              elements: { avatarBox: "w-8 h-8" },
            }}
          />
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>

      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        Powered by <span style={{ color: "#0ABAB5" }}>FieldDetect</span> · {org.name}
      </footer>
    </div>
  );
}
