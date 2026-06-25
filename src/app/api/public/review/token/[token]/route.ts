import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const inspection = await prisma.inspection.findUnique({
    where: { reviewToken: token },
    select: {
      id: true,
      inspectionNumber: true,
      customerRating: true,
      property: { select: { name: true } },
      organization: { select: { name: true, logoUrl: true, googleReviewUrl: true } },
    },
  });
  if (!inspection) return NextResponse.json({ error: "Review link not found or expired" }, { status: 404 });

  return NextResponse.json({
    data: {
      inspectionNumber: inspection.inspectionNumber,
      propertyName: inspection.property.name,
      orgName: inspection.organization.name,
      orgLogoUrl: inspection.organization.logoUrl,
      googleReviewUrl: inspection.organization.googleReviewUrl,
      alreadyReviewed: inspection.customerRating !== null,
      customerRating: inspection.customerRating,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { rating, feedback } = schema.parse(body);

    const inspection = await prisma.inspection.findUnique({ where: { reviewToken: token } });
    if (!inspection) return NextResponse.json({ error: "Review link not found or expired" }, { status: 404 });

    if (inspection.customerRating !== null) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    await prisma.inspection.update({
      where: { id: inspection.id },
      data: { customerRating: rating, customerFeedback: feedback ?? null },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    console.error("[REVIEW_TOKEN_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
