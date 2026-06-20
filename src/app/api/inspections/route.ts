import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateInspectionNumber } from "@/lib/utils";
import { z } from "zod";

const createInspectionSchema = z.object({
  appointmentId: z.string().min(1),
  k9TeamId: z.string().optional(),
  k9DogId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  accessNotes: z.string().optional(),
  scopeNotes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
    const customerId = searchParams.get("customerId");
    const propertyId = searchParams.get("propertyId");

    const where: Record<string, unknown> = { organizationId: user.organizationId };
    if (customerId) {
      where.property = { customerId };
    }
    if (propertyId) where.propertyId = propertyId;
    if (user.role === "TECHNICIAN") where.technicianId = user.id;

    const [inspections, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        include: {
          property: {
            include: { customer: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
          },
          technician: { select: { id: true, firstName: true, lastName: true } },
          k9Team: { select: { id: true, name: true } },
          k9Dog: { select: { id: true, name: true } },
          _count: { select: { inspectionUnits: true, photos: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "desc" },
      }),
      prisma.inspection.count({ where }),
    ]);

    return NextResponse.json({
      data: inspections,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[INSPECTIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const validated = createInspectionSchema.parse(body);

    // Verify appointment exists and belongs to org
    const appointment = await prisma.appointment.findFirst({
      where: { id: validated.appointmentId, organizationId: user.organizationId },
    });
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Check no existing inspection
    const existing = await prisma.inspection.findUnique({
      where: { appointmentId: validated.appointmentId },
    });
    if (existing) {
      return NextResponse.json({ data: existing });
    }

    const inspection = await prisma.$transaction(async (tx) => {
      const insp = await tx.inspection.create({
        data: {
          appointmentId: validated.appointmentId,
          propertyId: appointment.propertyId,
          technicianId: appointment.technicianId ?? user.id,
          k9TeamId: validated.k9TeamId ?? appointment.k9TeamId,
          k9DogId: validated.k9DogId,
          organizationId: user.organizationId,
          serviceType: appointment.serviceType,
          inspectionNumber: generateInspectionNumber(),
          startTime: validated.startTime ? new Date(validated.startTime) : new Date(),
          weather: validated.weather,
          temperature: validated.temperature,
          accessNotes: validated.accessNotes ?? appointment.accessNotes,
          scopeNotes: validated.scopeNotes,
        },
      });

      // Update appointment status
      await tx.appointment.update({
        where: { id: validated.appointmentId },
        data: {
          status: "INSPECTION_STARTED",
          actualStartTime: insp.startTime,
        },
      });

      return insp;
    });

    return NextResponse.json({ data: inspection }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTIONS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
