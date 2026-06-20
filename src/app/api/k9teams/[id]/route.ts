import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateK9TeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  leadTechnicianId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const addMemberSchema = z.object({
  action: z.enum(["add_member", "remove_member", "add_dog", "remove_dog"]),
  userId: z.string().optional(),
  dogId: z.string().optional(),
  dogName: z.string().optional(),
  dogBreed: z.string().optional(),
  certificationNumber: z.string().optional(),
  certificationExpiry: z.string().datetime().optional(),
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
    const team = await prisma.k9Team.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
          },
        },
        dogs: true,
        appointments: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            property: { select: { name: true, addressLine1: true } },
          },
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
        _count: { select: { appointments: true } },
      },
    });

    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("[K9TEAM_GET]", error);
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

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.k9Team.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // Handle member/dog actions
    if (body.action) {
      const validated = addMemberSchema.parse(body);

      if (validated.action === "add_member" && validated.userId) {
        await prisma.k9TeamMember.upsert({
          where: { k9TeamId_userId: { k9TeamId: id, userId: validated.userId } },
          update: {},
          create: { k9TeamId: id, userId: validated.userId },
        });
      } else if (validated.action === "remove_member" && validated.userId) {
        await prisma.k9TeamMember.deleteMany({
          where: { k9TeamId: id, userId: validated.userId },
        });
      } else if (validated.action === "add_dog") {
        await prisma.k9Dog.create({
          data: {
            k9TeamId: id,
            name: validated.dogName ?? "Unknown",
            breed: validated.dogBreed,
            certificationNumber: validated.certificationNumber,
            certifiedUntil: validated.certificationExpiry
              ? new Date(validated.certificationExpiry)
              : null,
          },
        });
      } else if (validated.action === "remove_dog" && validated.dogId) {
        await prisma.k9Dog.update({
          where: { id: validated.dogId },
          data: { isActive: false },
        });
      }

      const team = await prisma.k9Team.findUnique({
        where: { id },
        include: {
          members: { include: { user: true } },
          dogs: { where: { isActive: true } },
        },
      });
      return NextResponse.json({ data: team });
    }

    // Standard update
    const validated = updateK9TeamSchema.parse(body);
    const team = await prisma.k9Team.update({
      where: { id },
      data: validated,
      include: { members: { include: { user: true } }, dogs: true },
    });

    return NextResponse.json({ data: team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[K9TEAM_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
