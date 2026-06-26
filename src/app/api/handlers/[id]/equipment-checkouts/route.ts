import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  date:  z.string(),
  notes: z.string().nullable().optional(),
  items: z.array(z.object({ equipmentItemId: z.string() })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: handlerId } = await params;

    const targetUser = await prisma.user.findFirst({
      where: { id: handlerId, organizationId: user.organizationId },
    });
    if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const checkouts = await prisma.equipmentCheckout.findMany({
      where: { userId: handlerId, dogId: null },
      include: {
        items: { include: { equipmentItem: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    return NextResponse.json({ data: checkouts });
  } catch (error) {
    console.error("[HANDLER_CHECKOUT_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: handlerId } = await params;

    const targetUser = await prisma.user.findFirst({
      where: { id: handlerId, organizationId: user.organizationId },
    });
    if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = createSchema.parse(body);

    const itemsToInclude = validated.items?.length
      ? validated.items
      : (await prisma.equipmentItem.findMany({
          where: { organizationId: user.organizationId, isActive: true },
          select: { id: true },
        })).map((i) => ({ equipmentItemId: i.id }));

    const checkout = await prisma.equipmentCheckout.create({
      data: {
        organizationId: user.organizationId,
        userId: handlerId,
        dogId: null,
        date: new Date(validated.date),
        notes: validated.notes,
        items: {
          create: itemsToInclude.map((i) => ({
            equipmentItemId: i.equipmentItemId,
          })),
        },
      },
      include: {
        items: { include: { equipmentItem: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ data: checkout }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[HANDLER_CHECKOUT_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
