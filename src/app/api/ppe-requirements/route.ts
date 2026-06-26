import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  facilityType: z.string().min(1),
  name:         z.string().min(1),
  description:  z.string().nullable().optional(),
  isForHandler: z.boolean().default(true),
  isForDog:     z.boolean().default(false),
  sortOrder:    z.number().int().default(0),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const items = await prisma.facilityPPERequirement.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: [{ facilityType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[PPE_GET]", error);
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
    const validated = createSchema.parse(body);

    const item = await prisma.facilityPPERequirement.create({
      data: { organizationId: user.organizationId, ...validated },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PPE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
