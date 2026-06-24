import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user || !["OWNER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, recordId } = await params;
  const record = await prisma.k9InsurancePayment.findFirst({
    where: { id: recordId, dogId: id, dog: { k9Team: { organizationId: user.organizationId } } },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.k9InsurancePayment.delete({ where: { id: recordId } });
  return NextResponse.json({ success: true });
}
