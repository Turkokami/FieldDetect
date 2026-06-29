import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nestCount: z.coerce.number().int().min(0).optional().nullable(),
  totalEggCount: z.coerce.number().int().min(0).optional().nullable(),
  hatchedEggCount: z.coerce.number().int().min(0).optional().nullable(),
  unhatchedEggCount: z.coerce.number().int().min(0).optional().nullable(),
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
    const validated = schema.parse(body);

    const appt = await prisma.appointment.update({
      where: { id, organizationId: user.organizationId },
      data: validated,
      select: { id: true, nestCount: true, totalEggCount: true, hatchedEggCount: true, unhatchedEggCount: true },
    });

    return NextResponse.json({ data: appt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[GOOSE_PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
