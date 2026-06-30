import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  epaRegNumber: z.string().optional().nullable(),
  activeIngredient: z.string().optional().nullable(),
  signalWord: z.enum(["CAUTION", "WARNING", "DANGER", ""]).optional().nullable(),
  targetPests: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.chemical.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = patchSchema.parse(body);

    const chemical = await prisma.chemical.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.epaRegNumber !== undefined ? { epaRegNumber: validated.epaRegNumber } : {}),
        ...(validated.activeIngredient !== undefined ? { activeIngredient: validated.activeIngredient } : {}),
        ...(validated.signalWord !== undefined ? { signalWord: validated.signalWord || null } : {}),
        ...(validated.targetPests !== undefined ? { targetPests: validated.targetPests } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    return NextResponse.json({ data: chemical });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CHEMICAL_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.chemical.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { _count: { select: { applications: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing._count.applications > 0) {
    // Soft-delete if has usage history
    await prisma.chemical.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.chemical.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
