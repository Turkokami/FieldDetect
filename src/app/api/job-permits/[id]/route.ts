import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  permitType: z.string().optional(),
  permitNumber: z.string().nullable().optional(),
  issuingAuthority: z.string().nullable().optional(),
  issuedDate: z.string().datetime().nullable().optional(),
  expiresDate: z.string().datetime().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const body = await req.json();
    const validated = patchSchema.parse(body);
    const data: Record<string, unknown> = { ...validated };
    if (validated.issuedDate !== undefined) data.issuedDate = validated.issuedDate ? new Date(validated.issuedDate) : null;
    if (validated.expiresDate !== undefined) data.expiresDate = validated.expiresDate ? new Date(validated.expiresDate) : null;

    const permit = await prisma.jobPermit.update({
      where: { id, organizationId: user.organizationId },
      data,
    });
    return NextResponse.json({ data: permit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[JOB_PERMIT_PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.jobPermit.delete({ where: { id, organizationId: user.organizationId } });
  return NextResponse.json({ ok: true });
}
