import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  permitType: z.string().min(1),
  permitNumber: z.string().optional().nullable(),
  issuingAuthority: z.string().optional().nullable(),
  issuedDate: z.string().datetime().optional().nullable(),
  expiresDate: z.string().datetime().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get("appointmentId");

  const permits = await prisma.jobPermit.findMany({
    where: {
      organizationId: user.organizationId,
      ...(appointmentId ? { appointmentId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: permits });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const permit = await prisma.jobPermit.create({
      data: {
        organizationId: user.organizationId,
        appointmentId: validated.appointmentId ?? null,
        permitType: validated.permitType,
        permitNumber: validated.permitNumber ?? null,
        issuingAuthority: validated.issuingAuthority ?? null,
        issuedDate: validated.issuedDate ? new Date(validated.issuedDate) : null,
        expiresDate: validated.expiresDate ? new Date(validated.expiresDate) : null,
        status: validated.status ?? "PENDING",
        notes: validated.notes ?? null,
      },
    });

    return NextResponse.json({ data: permit }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[JOB_PERMITS_POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
