import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkSchema = z.object({
  status: z.enum(["CLEAR", "ACTIVITY", "TRIGGERED", "BAIT_CONSUMED", "BAIT_REPLACED", "DAMAGED", "REMOVED"]),
  notes: z.string().optional(),
  appointmentId: z.string().optional().nullable(),
  checkedAt: z.string().datetime().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const station = await prisma.station.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = checkSchema.parse(body);

    const check = await prisma.stationCheck.create({
      data: {
        stationId: id,
        checkedById: user.id,
        status: validated.status,
        notes: validated.notes,
        appointmentId: validated.appointmentId ?? null,
        checkedAt: validated.checkedAt ? new Date(validated.checkedAt) : new Date(),
      },
      include: { checkedBy: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json({ data: check }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[STATION_CHECK_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
