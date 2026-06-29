import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  colony: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "RETIRED", "DEAD"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:read");
    const { id } = await params;

    const vial = await prisma.bedBugVial.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: {
        feedingLogs: { orderBy: { fedAt: "desc" } },
        _count: { select: { feedingLogs: true } },
      },
    });

    if (!vial) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: vial });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;
    const body = await req.json();
    const validated = patchSchema.parse(body);

    const vial = await prisma.bedBugVial.update({
      where: { id, organizationId: ctx.organization.id },
      data: validated as never,
    });

    return NextResponse.json({ data: vial });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;

    await prisma.bedBugVial.delete({
      where: { id, organizationId: ctx.organization.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
