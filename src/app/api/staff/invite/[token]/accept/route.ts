import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { token } = await params;

    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? "";

    if (primaryEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    const role = invitation.role as "ADMIN" | "DISPATCHER" | "TECHNICIAN";

    await prisma.$transaction(async (tx) => {
      // Remove any placeholder user created for this email
      await tx.user.deleteMany({
        where: {
          email: invitation.email,
          organizationId: invitation.organizationId,
          clerkUserId: { startsWith: "pending_" },
        },
      });

      await tx.user.upsert({
        where: { clerkUserId: userId },
        update: {
          organizationId: invitation.organizationId,
          role,
          email: primaryEmail,
          firstName: clerkUser.firstName ?? "",
          lastName: clerkUser.lastName ?? "",
          avatarUrl: clerkUser.imageUrl,
          isActive: true,
        },
        create: {
          clerkUserId: userId,
          organizationId: invitation.organizationId,
          email: primaryEmail,
          firstName: clerkUser.firstName ?? "",
          lastName: clerkUser.lastName ?? "",
          avatarUrl: clerkUser.imageUrl,
          role,
        },
      });

      await tx.staffInvitation.update({
        where: { token },
        data: { acceptedAt: new Date() },
      });
    });

    const redirectTo = role === "TECHNICIAN" ? "/field" : "/dashboard";
    return NextResponse.json({ data: { redirectTo } });
  } catch (error) {
    console.error("[INVITE_ACCEPT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
