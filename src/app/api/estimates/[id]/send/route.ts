import { NextRequest, NextResponse } from "next/server";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { sendEstimate } from "@/lib/estimates";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;

    const updated = await sendEstimate(id, ctx.organization);
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "NotFound") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "NoCustomerEmail") {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
