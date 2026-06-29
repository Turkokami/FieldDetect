import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  fedAt: z.string().datetime(),
  fedOn: z.enum(["HUMAN", "PET", "OTHER"]).default("HUMAN"),
  fedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;

    // Verify vial belongs to org
    const vial = await prisma.bedBugVial.findFirst({
      where: { id, organizationId: ctx.organization.id },
    });
    if (!vial) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = createSchema.parse(body);

    const log = await prisma.vialFeedingLog.create({
      data: {
        vialId: id,
        fedAt: new Date(validated.fedAt),
        fedOn: validated.fedOn,
        fedBy: validated.fedBy ?? null,
        notes: validated.notes ?? null,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id: vialId } = await params;
    const { searchParams } = new URL(req.url);
    const feedingId = searchParams.get("feedingId");

    if (!feedingId) return NextResponse.json({ error: "feedingId required" }, { status: 400 });

    // Verify vial belongs to org
    const vial = await prisma.bedBugVial.findFirst({
      where: { id: vialId, organizationId: ctx.organization.id },
    });
    if (!vial) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.vialFeedingLog.delete({ where: { id: feedingId, vialId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
