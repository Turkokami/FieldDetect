import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().default("Site Map"),
  imageUrl: z.string().url(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: user.organizationId },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const maps = await prisma.propertyMap.findMany({
    where: { propertyId, organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: maps });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const property = await prisma.property.findFirst({
      where: { id: validated.propertyId, organizationId: user.organizationId },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const map = await prisma.propertyMap.create({
      data: {
        organizationId: user.organizationId,
        propertyId: validated.propertyId,
        name: validated.name,
        imageUrl: validated.imageUrl,
        markers: [],
      },
    });

    return NextResponse.json({ data: map }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTY_MAP_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
