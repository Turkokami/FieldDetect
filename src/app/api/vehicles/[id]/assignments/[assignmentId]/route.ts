import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, assignmentId } = await params;

    const assignment = await prisma.vehicleAssignment.findFirst({
      where: { id: assignmentId, vehicleId: id, vehicle: { organizationId: user.organizationId } },
    });
    if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.vehicleAssignment.delete({ where: { id: assignmentId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VEHICLE_ASSIGNMENT_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
