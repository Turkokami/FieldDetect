import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  vaccineName: z.string().min(1),
  dateGiven: z.string().datetime(),
  nextDueDate: z.string().datetime().optional().nullable(),
  administeredBy: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function resolveDog(dogId: string, orgId: string) {
  return prisma.k9Dog.findFirst({
    where: { id: dogId, k9Team: { organizationId: orgId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const dog = await resolveDog(id, user.organizationId);
  if (!dog) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await prisma.k9Vaccination.findMany({
    where: { dogId: id },
    orderBy: { dateGiven: "desc" },
  });
  return NextResponse.json({ data: records });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!["OWNER", "ADMIN"].includes(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const dog = await resolveDog(id, user.organizationId);
    if (!dog) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const v = createSchema.parse(body);

    const record = await prisma.k9Vaccination.create({
      data: {
        dogId: id,
        vaccineName: v.vaccineName,
        dateGiven: new Date(v.dateGiven),
        nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
        administeredBy: v.administeredBy ?? null,
        batchNumber: v.batchNumber ?? null,
        notes: v.notes ?? null,
      },
    });
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    console.error("[K9_VAC_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
