import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { seedCatalog } from "@/lib/products";

const schema = z.object({ set: z.enum(["exclusion", "holiday-samples"]) });

// POST /api/products/seed { set } adds the default products that are missing.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("products:write");
    const { set } = schema.parse(await req.json());
    const added = await seedCatalog(ctx.organization.id, set);
    return NextResponse.json({ data: { added } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
