import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  facilityType: z.string().min(1).optional(),
  name:         z.string().min(1).optional(),
  description:  z.string().nullable().optional(),
  isForHandler: z.boolean().optional(),
  isForDog:     z.boolean().optional(),
  sortOrder:    z.number().int().optional(),
  isActive:     z.boolean().optional(),
});

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
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const result = await prisma.facilityPPERequirement.updateMany({
      where: { id, organizationId: user.organizationId },
      data: validated,
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.facilityPPERequirement.findUnique({ where: { id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PPE_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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

    await prisma.facilityPPERequirement.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PPE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
