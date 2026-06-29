import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  colony: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  acquisitionDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const vials = await prisma.bedBugVial.findMany({
      where: {
        organizationId: ctx.organization.id,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        feedingLogs: {
          orderBy: { fedAt: "desc" },
          take: 1,
        },
        _count: { select: { feedingLogs: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: vials });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:write");
    const body = await req.json();
    const validated = createSchema.parse(body);

    const vial = await prisma.bedBugVial.create({
      data: {
        organizationId: ctx.organization.id,
        name: validated.name,
        colony: validated.colony ?? null,
        source: validated.source ?? null,
        acquisitionDate: validated.acquisitionDate ? new Date(validated.acquisitionDate) : new Date(),
        notes: validated.notes ?? null,
      },
      include: { _count: { select: { feedingLogs: true } } },
    });

    return NextResponse.json({ data: vial }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
