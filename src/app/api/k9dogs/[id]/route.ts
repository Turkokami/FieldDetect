import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  breed: z.string().optional().nullable(),
  certificationNumber: z.string().optional().nullable(),
  certifiedUntil: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  foodBrand: z.string().optional().nullable(),
  foodType: z.string().optional().nullable(),
  mannerisms: z.string().optional().nullable(),
  extras: z.string().optional().nullable(),
});

async function resolveDog(dogId: string, orgId: string) {
  return prisma.k9Dog.findFirst({
    where: { id: dogId, k9Team: { organizationId: orgId } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const dog = await resolveDog(id, user.organizationId);
    if (!dog) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = patchSchema.parse(body);

    const updated = await prisma.k9Dog.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.breed !== undefined && { breed: validated.breed }),
        ...(validated.certificationNumber !== undefined && { certificationNumber: validated.certificationNumber }),
        ...(validated.certifiedUntil !== undefined && {
          certifiedUntil: validated.certifiedUntil ? new Date(validated.certifiedUntil) : null,
        }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(validated.photoUrl !== undefined && { photoUrl: validated.photoUrl }),
        ...(validated.foodBrand !== undefined && { foodBrand: validated.foodBrand }),
        ...(validated.foodType !== undefined && { foodType: validated.foodType }),
        ...(validated.mannerisms !== undefined && { mannerisms: validated.mannerisms }),
        ...(validated.extras !== undefined && { extras: validated.extras }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[K9DOG_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const dog = await resolveDog(id, user.organizationId);
    if (!dog) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.k9Dog.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[K9DOG_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
