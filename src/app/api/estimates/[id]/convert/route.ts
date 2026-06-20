import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  scheduledDate: z.string().datetime(),
  technicianId: z.string().optional().nullable(),
  k9TeamId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("appointments:write");
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: { customer: true, property: true },
    });
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (estimate.status === "CONVERTED") {
      return NextResponse.json({ error: "Already converted" }, { status: 400 });
    }
    if (!estimate.propertyId) {
      return NextResponse.json({ error: "Estimate must have a property to convert" }, { status: 400 });
    }

    const body = await req.json();
    const validated = schema.parse(body);

    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          organizationId: ctx.organization.id,
          customerId: estimate.customerId,
          propertyId: estimate.propertyId!,
          technicianId: validated.technicianId ?? null,
          k9TeamId: validated.k9TeamId ?? null,
          serviceType: estimate.serviceType,
          status: "SCHEDULED",
          scheduledDate: new Date(validated.scheduledDate),
          title: estimate.title ?? undefined,
          description: estimate.scopeNotes ?? undefined,
          notes: validated.notes ?? undefined,
        },
      });

      await tx.estimate.update({
        where: { id },
        data: {
          status: "CONVERTED",
          convertedAt: new Date(),
          convertedToAppointmentId: appt.id,
        },
      });

      return appt;
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
