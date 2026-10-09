import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, rbacResponse } from "@/lib/auth";
import { isUniqueConstraintError } from "@/lib/estimates";
import { canSeeCost, productFields, skuSchema, stripCost } from "./shared";

const createSchema = z.object({ sku: skuSchema, ...productFields });

// GET /api/products?category=Exclusion&includeArchived=1
// Any signed-in staff member (the field calculator needs prices); unitCost only
// for OWNER/ADMIN.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const category = req.nextUrl.searchParams.get("category")?.trim();
    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "1" && canSeeCost(ctx);

    const products = await prisma.product.findMany({
      where: {
        organizationId: ctx.organization.id,
        ...(includeArchived ? {} : { isActive: true }),
        ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const showCost = canSeeCost(ctx);
    return NextResponse.json({ data: products.map((p) => stripCost(p, showCost)) });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("products:write");
    const data = createSchema.parse(await req.json());

    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const last = await prisma.product.findFirst({
        where: { organizationId: ctx.organization.id, category: data.category ?? null },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const product = await prisma.product.create({
      data: { ...data, sortOrder, category: data.category || null, organizationId: ctx.organization.id },
    });
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: "A product with that SKU already exists" }, { status: 409 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
