import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createK9TeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leadTechnicianId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const teams = await prisma.k9Team.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        dogs: { where: { isActive: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: teams });
  } catch (error) {
    console.error("[K9TEAMS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createK9TeamSchema.parse(body);

    const team = await prisma.k9Team.create({
      data: {
        ...validated,
        organizationId: user.organizationId,
      },
      include: { members: true, dogs: true },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[K9TEAMS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
