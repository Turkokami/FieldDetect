import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().min(1),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? "";

    // Check for a pending staff invitation for this email
    const pendingInvite = await prisma.staffInvitation.findFirst({
      where: {
        email: primaryEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { organization: true },
    });

    if (pendingInvite) {
      // Skip org creation — join the inviting org
      const result = await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({
          where: {
            email: primaryEmail,
            organizationId: pendingInvite.organizationId,
            clerkUserId: { startsWith: "pending_" },
          },
        });

        const user = await tx.user.upsert({
          where: { clerkUserId: userId },
          update: {
            organizationId: pendingInvite.organizationId,
            role: pendingInvite.role as "ADMIN" | "DISPATCHER" | "TECHNICIAN",
            email: primaryEmail,
            firstName: clerkUser.firstName ?? "",
            lastName: clerkUser.lastName ?? "",
            avatarUrl: clerkUser.imageUrl,
            isActive: true,
          },
          create: {
            clerkUserId: userId,
            organizationId: pendingInvite.organizationId,
            email: primaryEmail,
            firstName: clerkUser.firstName ?? "",
            lastName: clerkUser.lastName ?? "",
            avatarUrl: clerkUser.imageUrl,
            role: pendingInvite.role as "ADMIN" | "DISPATCHER" | "TECHNICIAN",
          },
        });

        await tx.staffInvitation.update({
          where: { id: pendingInvite.id },
          data: { acceptedAt: new Date() },
        });

        return { org: pendingInvite.organization, user };
      });

      return NextResponse.json({ data: result, inviteAccepted: true }, { status: 201 });
    }

    const body = await req.json();
    const validated = schema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      let org = orgId
        ? await tx.organization.findUnique({ where: { clerkOrgId: orgId } })
        : null;

      if (!org) {
        const slug = validated.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const uniqueSlug = `${slug}-${Date.now()}`;

        org = await tx.organization.create({
          data: {
            clerkOrgId: orgId ?? `solo_${userId}`,
            name: validated.companyName,
            slug: uniqueSlug,
            phone: validated.phone,
            addressLine1: validated.addressLine1,
            city: validated.city,
            state: validated.state,
            zip: validated.zip,
          },
        });
      } else {
        org = await tx.organization.update({
          where: { id: org.id },
          data: {
            name: validated.companyName,
            phone: validated.phone,
            addressLine1: validated.addressLine1,
            city: validated.city,
            state: validated.state,
            zip: validated.zip,
          },
        });
      }

      const user = await tx.user.upsert({
        where: { clerkUserId: userId },
        update: { organizationId: org.id },
        create: {
          clerkUserId: userId,
          organizationId: org.id,
          email: primaryEmail,
          firstName: clerkUser.firstName ?? "",
          lastName: clerkUser.lastName ?? "",
          avatarUrl: clerkUser.imageUrl,
          role: "OWNER",
        },
      });

      return { org, user };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[ONBOARDING_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
