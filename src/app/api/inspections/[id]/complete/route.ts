import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const completeSchema = z.object({
  endTime: z.string().datetime().optional(),
  summaryNotes: z.string().optional(),
  recommendations: z.string().optional(),
  overallResult: z.enum([
    "NEGATIVE", "POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION",
    "INCONCLUSIVE", "UNABLE_TO_INSPECT", "ACCESS_DENIED", "FOLLOW_UP_REQUIRED",
  ]).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional(),
  treatmentReferral: z.boolean().optional(),
  customerSignature: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const inspection = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = completeSchema.parse(body);

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const insp = await tx.inspection.update({
        where: { id },
        data: {
          ...validated,
          endTime: validated.endTime ? new Date(validated.endTime) : now,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : null,
          signedAt: validated.customerSignature ? now : null,
        },
        include: {
          appointment: true,
          property: { include: { customer: true } },
          inspectionUnits: { include: { photos: true } },
        },
      });

      // Update appointment
      await tx.appointment.update({
        where: { id: inspection.appointmentId },
        data: {
          status: "INSPECTION_COMPLETE",
          actualEndTime: insp.endTime,
        },
      });

      return insp;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTION_COMPLETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
