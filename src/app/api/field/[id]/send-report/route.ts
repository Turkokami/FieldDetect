import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notifyOnStatusChange } from "@/lib/notify";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: appointmentId } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId: user.organizationId },
      include: { inspection: { select: { id: true } } },
    });
    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();

    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "REPORT_SENT" },
      }),
      ...(appointment.inspection
        ? [prisma.inspection.update({
            where: { id: appointment.inspection.id },
            data: { reportGeneratedAt: now },
          })]
        : []),
    ]);

    // Fire notification (non-blocking)
    notifyOnStatusChange(appointmentId, "REPORT_SENT").catch(() => {});

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    console.error("[FIELD_SEND_REPORT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
