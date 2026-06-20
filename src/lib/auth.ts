import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { User, Organization } from "@prisma/client";

export type { User, Organization };

export type AuthContext = {
  user: User;
  organization: Organization;
  clerkUserId: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId, orgId } = await auth();

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { organization: true },
  });

  if (!user) return null;

  return {
    user,
    organization: user.organization,
    clerkUserId: userId,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

export async function syncUserFromClerk(clerkUserId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (existing) return existing;

  // Find or create organization from Clerk org membership
  // In production this is handled via Clerk webhooks
  return null;
}

export async function requirePermission(
  permission: string
): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  if (!hasPermission(ctx.user.role, permission)) throw new Error("Forbidden");
  return ctx;
}

export function rbacResponse(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof Error && err.message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export const ROLE_PERMISSIONS = {
  OWNER: [
    "customers:read",
    "customers:write",
    "customers:delete",
    "properties:read",
    "properties:write",
    "properties:delete",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "inspections:read",
    "inspections:write",
    "inspections:delete",
    "invoices:read",
    "invoices:write",
    "invoices:delete",
    "reports:read",
    "reports:write",
    "users:read",
    "users:write",
    "users:delete",
    "settings:read",
    "settings:write",
    "payments:read",
    "payments:write",
  ],
  ADMIN: [
    "customers:read",
    "customers:write",
    "customers:delete",
    "properties:read",
    "properties:write",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "inspections:read",
    "inspections:write",
    "invoices:read",
    "invoices:write",
    "reports:read",
    "reports:write",
    "users:read",
    "users:write",
    "settings:read",
    "payments:read",
    "payments:write",
  ],
  DISPATCHER: [
    "customers:read",
    "customers:write",
    "properties:read",
    "appointments:read",
    "appointments:write",
    "inspections:read",
    "invoices:read",
    "reports:read",
    "users:read",
  ],
  TECHNICIAN: [
    "customers:read",
    "properties:read",
    "appointments:read",
    "inspections:read",
    "inspections:write",
    "reports:read",
  ],
  CUSTOMER: [
    "appointments:read",
    "inspections:read",
    "invoices:read",
    "reports:read",
    "payments:write",
  ],
} as const;

export type Permission = (typeof ROLE_PERMISSIONS)["OWNER"][number];

export function hasPermission(role: keyof typeof ROLE_PERMISSIONS, permission: string): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}
