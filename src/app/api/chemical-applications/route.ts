import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  chemicalId: z.string().min(1),
  appointmentId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  mixRatio: z.string().optional().nullable(),
  amountUsed: z.number().min(0).optional().nullable(),
  unit: z.string().optional().nullable(),
  applicationMethod: z.string().optional().nullable(),
  targetPest: z.string().optional().nullable(),
  treatmentArea: z.string().optional().nullable(),
  appliedAt: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get("appointmentId");
  const propertyId = searchParams.get("propertyId");

  const applications = await prisma.chemicalApplication.findMany({
    where: {
      organizationId: user.organizationId,
      ...(appointmentId ? { appointmentId } : {}),
      ...(propertyId ? { propertyId } : {}),
    },
    include: { chemical: true, appliedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({ data: applications });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const chemical = await prisma.chemical.findFirst({
      where: { id: validated.chemicalId, organizationId: user.organizationId },
    });
    if (!chemical) return NextResponse.json({ error: "Chemical not found" }, { status: 404 });

    const application = await prisma.chemicalApplication.create({
      data: {
        organizationId: user.organizationId,
        chemicalId: validated.chemicalId,
        appointmentId: validated.appointmentId ?? null,
        propertyId: validated.propertyId ?? null,
        mixRatio: validated.mixRatio ?? null,
        amountUsed: validated.amountUsed ?? null,
        unit: validated.unit ?? null,
        applicationMethod: validated.applicationMethod ?? null,
        targetPest: validated.targetPest ?? null,
        treatmentArea: validated.treatmentArea ?? null,
        appliedById: user.id,
        appliedAt: validated.appliedAt ? new Date(validated.appliedAt) : new Date(),
        notes: validated.notes ?? null,
      },
      include: { chemical: true, appliedBy: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CHEM_APP_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
