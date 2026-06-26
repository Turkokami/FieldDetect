import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  rate: z.number().min(0).max(100),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const taxCodes = await prisma.taxCode.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isDefault: "desc" }, { state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: taxCodes });
  } catch (error) {
    console.error("[TAX_CODES_GET]", error);
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

    // If setting as default, clear other defaults first
    if (validated.isDefault) {
      await prisma.taxCode.updateMany({
        where: { organizationId: user.organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const taxCode = await prisma.taxCode.create({
      data: { ...validated, organizationId: user.organizationId },
    });

    return NextResponse.json({ data: taxCode }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[TAX_CODES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
