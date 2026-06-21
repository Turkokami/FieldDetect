import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const unitSchema = z.object({
  unitNumber: z.string().min(1),
  buildingName: z.string().optional(),
  floor: z.string().optional(),
  unitType: z.enum([
    "APARTMENT", "HOTEL_ROOM", "DORM_ROOM", "OFFICE", "ROOM",
    "SUITE", "FLOOR", "AREA", "COMMON_AREA", "LOBBY", "HALLWAY",
    "STORAGE", "OTHER",
  ]).default("APARTMENT"),
  occupant: z.string().optional(),
  detectionResult: z.enum([
    "NEGATIVE", "POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION",
    "INCONCLUSIVE", "UNABLE_TO_INSPECT", "ACCESS_DENIED", "FOLLOW_UP_REQUIRED",
  ]).default("NEGATIVE"),
  severityLevel: z.enum(["NONE", "LOW", "MODERATE", "HIGH", "SEVERE"]).default("NONE"),
  alertLocation: z.string().optional().nullable(),
  visualEvidence: z.boolean().default(false),
  visualNotes: z.string().optional().nullable(),
  technicianNotes: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().datetime().optional(),
  treatmentReferral: z.boolean().default(false),
  accessGranted: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const bulkSchema = z.object({
  units: z.array(unitSchema),
  replaceAll: z.boolean().default(false),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const units = await prisma.inspectionUnit.findMany({
      where: { inspectionId: id },
      include: { photos: true, unit: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: units });
  } catch (error) {
    console.error("[INSPECTION_UNITS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });

    const body = await req.json();
    const validated = bulkSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      if (validated.replaceAll) {
        await tx.inspectionUnit.deleteMany({ where: { inspectionId: id } });
      }

      const created = await tx.inspectionUnit.createMany({
        data: validated.units.map((unit) => ({
          ...unit,
          inspectionId: id,
          followUpDate: unit.followUpDate ? new Date(unit.followUpDate) : null,
          inspectedAt: new Date(),
        })),
      });

      // Recompute totals
      const allUnits = await tx.inspectionUnit.findMany({
        where: { inspectionId: id },
        select: { detectionResult: true, accessGranted: true },
      });

      const totals = allUnits.reduce(
        (acc, u) => {
          acc.total++;
          if (u.detectionResult === "NEGATIVE") acc.negative++;
          else if (
            u.detectionResult === "POSITIVE_K9_ALERT" ||
            u.detectionResult === "VISUAL_CONFIRMATION"
          ) acc.positive++;
          else if (u.detectionResult === "INCONCLUSIVE") acc.inconclusive++;
          else if (
            u.detectionResult === "UNABLE_TO_INSPECT" ||
            u.detectionResult === "ACCESS_DENIED"
          ) acc.inaccessible++;
          return acc;
        },
        { total: 0, positive: 0, negative: 0, inconclusive: 0, inaccessible: 0 }
      );

      await tx.inspection.update({
        where: { id },
        data: {
          totalUnitsInspected: totals.total,
          totalPositive: totals.positive,
          totalNegative: totals.negative,
          totalInconclusive: totals.inconclusive,
          totalInaccessible: totals.inaccessible,
        },
      });

      return created;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTION_UNITS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
