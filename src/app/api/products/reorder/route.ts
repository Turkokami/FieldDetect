import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

// POST /api/products/reorder { ids: [...] } sets sortOrder to each id's position.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("products:write");
    const { ids } = schema.parse(await req.json());
    await prisma.$transaction(
      ids.map((id, i) =>
        prisma.product.updateMany({ where: { id, organizationId: ctx.organization.id }, data: { sortOrder: i } })
      )
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
