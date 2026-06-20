import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "DISPATCHER", "TECHNICIAN"]),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search") ?? "";

    const users = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        ...(role && { role: role as "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN" }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { assignedAppointments: true } },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("[USERS_GET]", error);
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
    const validated = inviteUserSchema.parse(body);

    // Create placeholder user record — will be fully populated when they accept invite via Clerk webhook
    const newUser = await prisma.user.create({
      data: {
        clerkUserId: `pending_${Date.now()}`,
        organizationId: user.organizationId,
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
      },
    });

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[USERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
