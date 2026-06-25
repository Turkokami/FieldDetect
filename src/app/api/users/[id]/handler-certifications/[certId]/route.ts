import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id, certId } = await params;
  const isSelf = currentUser.id === id;
  if (!isSelf && !["OWNER", "ADMIN"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cert = await prisma.handlerCertification.findFirst({
    where: { id: certId, userId: id },
  });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.handlerCertification.delete({ where: { id: certId } });
  return NextResponse.json({ success: true });
}
