import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  floors: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;
    const property = await prisma.property.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const body = await req.json();
    const validated = schema.parse(body);

    const building = await prisma.building.create({
      data: { ...validated, propertyId: id },
    });

    return NextResponse.json({ data: building }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[BUILDINGS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
