import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  checkedOutAt: z.string().nullable().optional(),
  returnedAt:   z.string().nullable().optional(),
  notes:        z.string().nullable().optional(),
  items: z.array(z.object({
    id:          z.string(),
    isCheckedOut: z.boolean().optional(),
    isReturned:  z.boolean().optional(),
    condition:   z.string().nullable().optional(),
    notes:       z.string().nullable().optional(),
  })).optional(),
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

    const { id } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.equipmentCheckout.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (validated.checkedOutAt !== undefined) {
      updateData.checkedOutAt = validated.checkedOutAt ? new Date(validated.checkedOutAt) : null;
    }
    if (validated.returnedAt !== undefined) {
      updateData.returnedAt = validated.returnedAt ? new Date(validated.returnedAt) : null;
    }
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const checkout = await prisma.equipmentCheckout.update({
      where: { id },
      data: updateData,
    });

    // Update individual items
    if (validated.items?.length) {
      await Promise.all(
        validated.items.map((item) => {
          const itemData: Record<string, unknown> = {};
          if (item.isCheckedOut !== undefined) itemData.isCheckedOut = item.isCheckedOut;
          if (item.isReturned !== undefined) itemData.isReturned = item.isReturned;
          if (item.condition !== undefined) itemData.condition = item.condition;
          if (item.notes !== undefined) itemData.notes = item.notes;
          return prisma.equipmentCheckoutItem.updateMany({
            where: { id: item.id, checkoutId: id },
            data: itemData,
          });
        })
      );
    }

    const updated = await prisma.equipmentCheckout.findUnique({
      where: { id },
      include: {
        items: { include: { equipmentItem: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CHECKOUT_PATCH]", error);
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

    const { id } = await params;

    await prisma.equipmentCheckout.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHECKOUT_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
