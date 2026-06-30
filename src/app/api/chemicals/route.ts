import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  epaRegNumber: z.string().optional().nullable(),
  activeIngredient: z.string().optional().nullable(),
  signalWord: z.enum(["CAUTION", "WARNING", "DANGER", ""]).optional().nullable(),
  targetPests: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const chemicals = await prisma.chemical.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: chemicals });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const chemical = await prisma.chemical.create({
      data: {
        organizationId: user.organizationId,
        name: validated.name,
        epaRegNumber: validated.epaRegNumber ?? null,
        activeIngredient: validated.activeIngredient ?? null,
        signalWord: validated.signalWord || null,
        targetPests: validated.targetPests,
        notes: validated.notes ?? null,
      },
    });

    return NextResponse.json({ data: chemical }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CHEMICAL_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
