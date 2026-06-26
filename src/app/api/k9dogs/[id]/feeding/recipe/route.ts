import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  ingredient: z.string().min(1),
  amount:     z.string().min(1),
  unit:       z.string().default("cups"),
  sortOrder:  z.number().int().default(0),
});

async function getDogCtx(dogId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) return null;
  const dog = await prisma.k9Dog.findFirst({
    where: { id: dogId, k9Team: { organizationId: user.organizationId } },
  });
  return dog ? user : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await getDogCtx(id, userId);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = itemSchema.parse(body);

    const item = await prisma.feedingRecipeItem.create({
      data: { dogId: id, ...validated },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[FEEDING_RECIPE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
