import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  userId: z.string().optional(),
  k9TeamId: z.string().optional(),
  notes: z.string().optional().nullable(),
}).refine((d) => d.userId || d.k9TeamId, { message: "Provide userId or k9TeamId" });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assignments = await prisma.vehicleAssignment.findMany({
      where: { vehicleId: id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
        k9Team: { select: { id: true, name: true, dogs: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error("[VEHICLE_ASSIGNMENTS_GET]", error);
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
    if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = createSchema.parse(body);

    // Validate the referenced user/team belongs to the same org
    if (data.userId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.userId, organizationId: user.organizationId },
      });
      if (!assignee) return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (data.k9TeamId) {
      const team = await prisma.k9Team.findFirst({
        where: { id: data.k9TeamId, organizationId: user.organizationId },
      });
      if (!team) return NextResponse.json({ error: "K9 team not found" }, { status: 404 });
    }

    const assignment = await prisma.vehicleAssignment.create({
      data: {
        vehicleId: id,
        userId: data.userId ?? null,
        k9TeamId: data.k9TeamId ?? null,
        notes: data.notes ?? null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
        k9Team: { select: { id: true, name: true, dogs: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_ASSIGNMENTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
