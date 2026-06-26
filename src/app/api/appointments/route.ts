import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAppointmentSchema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().min(1),
  technicianId: z.string().optional(),
  k9TeamId: z.string().optional(),
  serviceType: z.enum([
    "BED_BUG_INSPECTION", "BED_BUG_TREATMENT", "RODENT_INSPECTION",
    "RODENT_EXCLUSION", "WILDLIFE_INSPECTION", "WILDLIFE_REMOVAL",
    "BIRD_EXCLUSION", "GOOSE_CONTROL", "GENERAL_PEST_INSPECTION",
    "GENERAL_PEST_TREATMENT", "OTHER",
  ]).default("BED_BUG_INSPECTION"),
  scheduledDate: z.string().datetime(),
  scheduledEndTime: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  accessNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  priority: z.number().int().default(0),
  recurrence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
});

function nextRecurringDate(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "WEEKLY":    d.setDate(d.getDate() + 7); break;
    case "BIWEEKLY":  d.setDate(d.getDate() + 14); break;
    case "MONTHLY":   d.setMonth(d.getMonth() + 1); break;
    case "QUARTERLY": d.setMonth(d.getMonth() + 3); break;
    case "ANNUALLY":  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function buildRecurringSeries(start: Date, endTime: Date | null, frequency: string, seriesEnd: Date): Date[][] {
  const pairs: Date[][] = [];
  let cur = new Date(start);
  const durationMs = endTime ? endTime.getTime() - start.getTime() : 0;

  while (cur <= seriesEnd && pairs.length < 104) {
    const curEnd = durationMs > 0 ? new Date(cur.getTime() + durationMs) : null;
    pairs.push([new Date(cur), ...(curEnd ? [curEnd] : [])]);
    cur = nextRecurringDate(cur, frequency);
  }
  return pairs;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const technicianId = searchParams.get("technicianId");
    const customerId = searchParams.get("customerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    };

    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.scheduledDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // Technicians can only see their own appointments
    if (user.role === "TECHNICIAN") {
      where.technicianId = user.id;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, companyName: true, phone: true },
          },
          property: {
            select: { id: true, name: true, addressLine1: true, city: true, state: true, propertyType: true },
          },
          technician: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          k9Team: { select: { id: true, name: true } },
          inspection: { select: { id: true, inspectionNumber: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { scheduledDate: "asc" },
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      data: appointments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[APPOINTMENTS_GET]", error);
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
    const validated = createAppointmentSchema.parse(body);

    const baseDate = new Date(validated.scheduledDate);
    const baseEnd = validated.scheduledEndTime ? new Date(validated.scheduledEndTime) : null;
    const { recurrence, recurrenceEndDate, ...baseFields } = validated;

    if (recurrence && recurrenceEndDate) {
      const seriesEnd = new Date(recurrenceEndDate);
      const series = buildRecurringSeries(baseDate, baseEnd, recurrence, seriesEnd);

      const parent = await prisma.$transaction(async (tx) => {
        const first = await tx.appointment.create({
          data: {
            ...baseFields,
            organizationId: user.organizationId,
            scheduledDate: series[0][0],
            scheduledEndTime: series[0][1] ?? null,
            recurrence,
            recurrenceEndDate: seriesEnd,
          },
          include: { customer: true, property: true, technician: true, k9Team: true },
        });

        if (series.length > 1) {
          await tx.appointment.createMany({
            data: series.slice(1).map(([d, end]) => ({
              ...baseFields,
              organizationId: user.organizationId,
              scheduledDate: d,
              scheduledEndTime: end ?? null,
              recurrence,
              recurrenceEndDate: seriesEnd,
              parentAppointmentId: first.id,
            })),
          });
        }
        return first;
      });

      return NextResponse.json(
        { data: parent, seriesCount: series.length },
        { status: 201 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        ...baseFields,
        organizationId: user.organizationId,
        scheduledDate: baseDate,
        scheduledEndTime: baseEnd,
      },
      include: { customer: true, property: true, technician: true, k9Team: true },
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[APPOINTMENTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
