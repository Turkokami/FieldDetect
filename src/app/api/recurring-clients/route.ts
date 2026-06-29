import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  serviceType: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional().nullable(),
});

async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { clerkUserId: userId } });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clients = await prisma.recurringClient.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: {
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      property: { select: { name: true, addressLine1: true, city: true } },
      technician: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ technicianId: "asc" }, { routeOrder: "asc" }],
  });

  return NextResponse.json({ data: clients });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["OWNER", "ADMIN", "DISPATCHER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const client = await prisma.recurringClient.create({
      data: {
        organizationId: user.organizationId,
        customerId: validated.customerId,
        propertyId: validated.propertyId ?? null,
        technicianId: validated.technicianId ?? null,
        serviceType: (validated.serviceType as never) ?? "BED_BUG_INSPECTION",
        frequency: validated.frequency ?? "MONTHLY",
        notes: validated.notes ?? null,
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, addressLine1: true, city: true } },
        technician: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[RECURRING_CLIENTS_POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
