import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
      include: { organization: { select: { name: true, logoUrl: true } } },
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

    return NextResponse.json({
      data: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        organizationLogoUrl: invitation.organization.logoUrl,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("[INVITE_TOKEN_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { token } = await params;
    // Supports both token and id-based deletion
    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        OR: [{ token }, { id: token }],
        organizationId: user.organizationId,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.staffInvitation.delete({ where: { id: invitation.id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[INVITE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
