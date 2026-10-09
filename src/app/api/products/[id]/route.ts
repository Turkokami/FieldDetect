import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { productFields } from "../shared";

const updateSchema = z
  .object({ ...productFields, isActive: z.boolean() })
  .partial();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("products:write");
    const { id } = await params;
    const data = updateSchema.parse(await req.json());

    const existing = await prisma.product.findFirst({ where: { id, organizationId: ctx.organization.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const product = await prisma.product.update({
      where: { id },
      data: { ...data, ...(data.category !== undefined ? { category: data.category || null } : {}) },
    });
    return NextResponse.json({ data: product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Soft delete: archived products drop off the price list but stay linked to
// past estimate line items.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("products:write");
    const { id } = await params;
    const { count } = await prisma.product.updateMany({
      where: { id, organizationId: ctx.organization.id },
      data: { isActive: false },
    });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id, isActive: false } });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
