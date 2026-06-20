import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  detectionResult: z.enum([
    "NEGATIVE", "POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION",
    "INCONCLUSIVE", "UNABLE_TO_INSPECT", "ACCESS_DENIED", "FOLLOW_UP_REQUIRED",
  ]).optional(),
  severityLevel: z.enum(["NONE", "LOW", "MODERATE", "HIGH", "SEVERE"]).optional(),
  alertLocation: z.string().optional().nullable(),
  visualEvidence: z.boolean().optional(),
  visualNotes: z.string().optional().nullable(),
  technicianNotes: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  treatmentReferral: z.boolean().optional(),
  accessGranted: z.boolean().optional(),
  inspectedAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    const existing = await prisma.inspectionUnit.findUnique({
      where: { id },
      include: { inspection: { select: { organizationId: true, id: true } } },
    });
    if (!existing || existing.inspection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const unit = await tx.inspectionUnit.update({
        where: { id },
        data: {
          ...validated,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
          inspectedAt: validated.inspectedAt ? new Date(validated.inspectedAt) : undefined,
        },
        include: { photos: true },
      });

      // Recompute inspection totals
      const allUnits = await tx.inspectionUnit.findMany({
        where: { inspectionId: existing.inspection.id },
        select: { detectionResult: true },
      });

      const totals = allUnits.reduce(
        (acc, u) => {
          acc.total++;
          if (u.detectionResult === "NEGATIVE") acc.negative++;
          else if (["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(u.detectionResult)) acc.positive++;
          else if (u.detectionResult === "INCONCLUSIVE") acc.inconclusive++;
          else if (["UNABLE_TO_INSPECT", "ACCESS_DENIED"].includes(u.detectionResult)) acc.inaccessible++;
          return acc;
        },
        { total: 0, positive: 0, negative: 0, inconclusive: 0, inaccessible: 0 }
      );

      await tx.inspection.update({
        where: { id: existing.inspection.id },
        data: {
          totalUnitsInspected: totals.total,
          totalPositive: totals.positive,
          totalNegative: totals.negative,
          totalInconclusive: totals.inconclusive,
          totalInaccessible: totals.inaccessible,
        },
      });

      return unit;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTION_UNIT_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const existing = await prisma.inspectionUnit.findUnique({
      where: { id },
      include: { inspection: { select: { organizationId: true, id: true } } },
    });
    if (!existing || existing.inspection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.inspectionUnit.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[INSPECTION_UNIT_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
