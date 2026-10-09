import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const appt = await prisma.appointment.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Use raw SQL so Prisma's @updatedAt is NOT triggered — if we use .update(),
  // "updatedAt" gets bumped to now() which makes the row appear unread again
  // (the unread query checks "officeNotesReadAt" < "updatedAt").
  await prisma.$executeRaw`
    UPDATE appointments
    SET "officeNotesReadAt" = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
