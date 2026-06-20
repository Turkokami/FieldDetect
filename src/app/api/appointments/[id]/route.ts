import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAppointmentSchema = z.object({
  technicianId: z.string().optional().nullable(),
  k9TeamId: z.string().optional().nullable(),
  status: z.enum([
    "REQUESTED", "SCHEDULED", "CONFIRMED", "EN_ROUTE", "ON_SITE",
    "INSPECTION_STARTED", "INSPECTION_COMPLETE", "REPORT_SENT",
    "INVOICED", "PAID", "CANCELLED", "NO_SHOW",
  ]).optional(),
  scheduledDate: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  actualStartTime: z.string().datetime().optional().nullable(),
  actualEndTime: z.string().datetime().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional(),
  accessNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  priority: z.number().int().optional(),
  routeOrder: z.number().int().optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
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
    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { include: { contacts: true } },
        property: { include: { buildings: true } },
        technician: true,
        k9Team: { include: { members: { include: { user: true } }, dogs: true } },
        inspection: {
          include: {
            inspectionUnits: { include: { photos: true }, orderBy: { sortOrder: "asc" } },
            photos: true,
          },
        },
      },
    });

    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error("[APPOINTMENT_GET]", error);
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
    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateAppointmentSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.scheduledDate) updateData.scheduledDate = new Date(validated.scheduledDate);
    if (validated.scheduledEndTime) updateData.scheduledEndTime = new Date(validated.scheduledEndTime);
    if (validated.actualStartTime) updateData.actualStartTime = new Date(validated.actualStartTime);
    if (validated.actualEndTime) updateData.actualEndTime = new Date(validated.actualEndTime);

    if (validated.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
    }
    if (validated.status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { customer: true, property: true, technician: true, k9Team: true },
    });

    return NextResponse.json({ data: appointment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[APPOINTMENT_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
