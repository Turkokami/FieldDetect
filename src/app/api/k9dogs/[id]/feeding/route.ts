import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  morningEnabled:   z.boolean().optional(),
  morningTime:      z.string().nullable().optional(),
  morningAmount:    z.string().nullable().optional(),
  afternoonEnabled: z.boolean().optional(),
  afternoonTime:    z.string().nullable().optional(),
  afternoonAmount:  z.string().nullable().optional(),
  eveningEnabled:   z.boolean().optional(),
  eveningTime:      z.string().nullable().optional(),
  eveningAmount:    z.string().nullable().optional(),
  notes:            z.string().nullable().optional(),
});

async function getDogForUser(dogId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;
  const dog = await prisma.k9Dog.findFirst({
    where: {
      id: dogId,
      k9Team: { organizationId: user.organizationId },
    },
  });
  return dog ? { dog, user } : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const ctx = await getDogForUser(id, userId);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [schedule, medications, recipeItems] = await Promise.all([
      prisma.feedingSchedule.findUnique({ where: { dogId: id } }),
      prisma.feedingMedication.findMany({ where: { dogId: id }, orderBy: { createdAt: "asc" } }),
      prisma.feedingRecipeItem.findMany({ where: { dogId: id }, orderBy: { sortOrder: "asc" } }),
    ]);

    return NextResponse.json({ data: { schedule, medications, recipeItems } });
  } catch (error) {
    console.error("[FEEDING_GET]", error);
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

    const { id } = await params;
    const ctx = await getDogForUser(id, userId);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = scheduleSchema.parse(body);

    const schedule = await prisma.feedingSchedule.upsert({
      where: { dogId: id },
      create: { dogId: id, ...validated },
      update: validated,
    });

    return NextResponse.json({ data: schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[FEEDING_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
