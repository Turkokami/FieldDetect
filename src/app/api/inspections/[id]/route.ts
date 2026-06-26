import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInspectionSchema = z.object({
  k9TeamId: z.string().optional().nullable(),
  k9DogId: z.string().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  weather: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  scopeNotes: z.string().optional().nullable(),
  summaryNotes: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  overallResult: z.enum([
    "NEGATIVE", "POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION",
    "INCONCLUSIVE", "UNABLE_TO_INSPECT", "ACCESS_DENIED", "FOLLOW_UP_REQUIRED",
  ]).optional().nullable(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  treatmentReferral: z.boolean().optional(),
  customerSignature: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
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
    const inspection = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        appointment: true,
        property: {
          include: {
            customer: { include: { contacts: true } },
            buildings: true,
          },
        },
        technician: true,
        k9Team: { include: { members: { include: { user: true } }, dogs: true } },
        k9Dog: true,
        inspectionUnits: {
          include: { photos: true, unit: true },
          orderBy: { sortOrder: "asc" },
        },
        photos: { orderBy: { sortOrder: "asc" } },
        invoice: true,
      },
    });

    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: inspection });
  } catch (error) {
    console.error("[INSPECTION_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const existing = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateInspectionSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.endTime !== undefined) updateData.endTime = validated.endTime ? new Date(validated.endTime) : null;
    if (validated.followUpDate !== undefined) updateData.followUpDate = validated.followUpDate ? new Date(validated.followUpDate) : null;
    if (validated.customerSignature !== undefined) updateData.signedAt = validated.customerSignature ? new Date() : null;

    const inspection = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        inspectionUnits: { include: { photos: true }, orderBy: { sortOrder: "asc" } },
        photos: true,
      },
    });

    return NextResponse.json({ data: inspection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTION_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
