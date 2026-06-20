import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  filename: z.string().min(1),
  caption: z.string().optional().nullable(),
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
    const unit = await prisma.inspectionUnit.findUnique({
      where: { id },
      include: { inspection: { select: { organizationId: true, id: true } } },
    });
    if (!unit || unit.inspection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = schema.parse(body);

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: unit.inspection.id,
        inspectionUnitId: id,
        url: validated.url,
        key: validated.key,
        filename: validated.filename,
        caption: validated.caption ?? null,
        takenAt: new Date(),
      },
    });

    return NextResponse.json({ data: photo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INSPECTION_UNIT_PHOTOS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");
    if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

    const photo = await prisma.inspectionPhoto.findUnique({
      where: { id: photoId },
      include: { inspection: { select: { organizationId: true } } },
    });
    if (!photo || photo.inspection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.inspectionPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[INSPECTION_UNIT_PHOTOS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
