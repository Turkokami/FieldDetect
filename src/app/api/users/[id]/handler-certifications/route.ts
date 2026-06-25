import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  issuedBy: z.string().optional().nullable(),
  certNumber: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const target = await prisma.user.findFirst({
    where: { id, organizationId: currentUser.organizationId },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const certs = await prisma.handlerCertification.findMany({
    where: { userId: id },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json({ data: certs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const isSelf = currentUser.id === id;
  if (!isSelf && !["OWNER", "ADMIN"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({
    where: { id, organizationId: currentUser.organizationId },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const validated = createSchema.parse(body);

  const cert = await prisma.handlerCertification.create({
    data: {
      userId: id,
      name: validated.name,
      issuedBy: validated.issuedBy ?? null,
      certNumber: validated.certNumber ?? null,
      issuedAt: validated.issuedAt ? new Date(validated.issuedAt) : null,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
      notes: validated.notes ?? null,
    },
  });

  return NextResponse.json({ data: cert }, { status: 201 });
}
