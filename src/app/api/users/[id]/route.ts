import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "DISPATCHER", "TECHNICIAN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        createdAt: true,
        assignedAppointments: {
          select: { id: true, scheduledDate: true, status: true },
          orderBy: { scheduledDate: "desc" },
          take: 20,
        },
        _count: { select: { assignedAppointments: true } },
      },
    });

    if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: targetUser });
  } catch (error) {
    console.error("[USER_GET]", error);
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

    const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    // Users can update themselves; admins/owners can update anyone in org
    const isSelf = currentUser.id === id;
    if (!isSelf && !["OWNER", "ADMIN"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    });
    if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    // Non-admins cannot change roles
    if (validated.role && !["OWNER", "ADMIN"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[USER_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
