import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata, Viewport } from "next";
import FieldBottomNav from "./field-bottom-nav";

export const metadata: Metadata = {
  title: { default: "FieldDetect", template: "%s | FieldDetect" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FieldDetect" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0ABAB5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

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
      <FieldBottomNav />
    </div>
  );
}
