import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rbacResponse } from "@/lib/auth";
import { requireApiKey } from "@/lib/api-key";

// GET /api/integrations/products?category=Holiday%20Lighting (API key, scope products:read)
// The org's active price list, for tools like the Roof Estimator.
export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireApiKey(req, "products:read");
    const category = req.nextUrl.searchParams.get("category")?.trim();

    const products = await prisma.product.findMany({
      where: {
        organizationId: organization.id,
        isActive: true,
        ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      },
      select: {
        sku: true,
        name: true,
        category: true,
        serviceType: true,
        unit: true,
        unitPrice: true,
        unitCost: true,
        sortOrder: true,
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: products });
  } catch (err) {
    const r = rbacResponse(err);
    if (r) return r;
    console.error("[INTEGRATION_PRODUCTS]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
