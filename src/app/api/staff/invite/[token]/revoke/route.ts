import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    const invitation = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.staffInvitation.delete({ where: { token } });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("[INVITE_REVOKE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
