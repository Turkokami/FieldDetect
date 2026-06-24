import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  const { inspectionId } = await params;
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      inspectionNumber: true,
      customerRating: true,
      customerFeedback: true,
      property: { select: { name: true } },
      appointment: { select: { customer: { select: { firstName: true } } } },
    },
  });
  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: inspection });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    const body = await req.json();
    const { rating, feedback } = schema.parse(body);

    const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (inspection.customerRating !== null) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    await prisma.inspection.update({
      where: { id: inspectionId },
      data: { customerRating: rating, customerFeedback: feedback },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    console.error("[REVIEW_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
