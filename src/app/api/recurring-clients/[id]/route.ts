import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  technicianId: z.string().nullable().optional(),
  serviceType: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  routeOrder: z.number().int().optional(),
});

async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { clerkUserId: userId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(userId);
  if (!user || !["OWNER", "ADMIN", "DISPATCHER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const validated = patchSchema.parse(body);

    const { technicianId, serviceType, ...rest } = validated;
    const data = {
      ...rest,
      ...(serviceType !== undefined ? { serviceType: serviceType as never } : {}),
      ...(technicianId !== undefined
        ? { technician: technicianId ? { connect: { id: technicianId } } : { disconnect: true } }
        : {}),
    };

    const client = await prisma.recurringClient.update({
      where: { id, organizationId: user.organizationId },
      data,
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, addressLine1: true, city: true } },
        technician: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ data: client });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[RECURRING_CLIENT_PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(userId);
  if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.recurringClient.update({
    where: { id, organizationId: user.organizationId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
