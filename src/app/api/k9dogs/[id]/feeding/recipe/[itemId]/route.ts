import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  ingredient: z.string().min(1).optional(),
  amount:     z.string().min(1).optional(),
  unit:       z.string().optional(),
  sortOrder:  z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { itemId } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const result = await prisma.feedingRecipeItem.updateMany({
      where: { id: itemId, dog: { k9Team: { organizationId: user.organizationId } } },
      data: validated,
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.feedingRecipeItem.findUnique({ where: { id: itemId } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[FEEDING_RECIPE_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { itemId } = await params;

    await prisma.feedingRecipeItem.deleteMany({
      where: { id: itemId, dog: { k9Team: { organizationId: user.organizationId } } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FEEDING_RECIPE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
