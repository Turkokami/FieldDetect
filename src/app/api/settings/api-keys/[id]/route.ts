import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";

// Revoke (soft): the key stops working immediately; the row stays for the record.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("api_keys:manage");
    const { id } = await params;

    const existing = await prisma.apiKey.findFirst({
      where: { id, organizationId: ctx.organization.id },
      select: { id: true, name: true, prefix: true, revokedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const revokedAt = existing.revokedAt ?? new Date();
    if (!existing.revokedAt) {
      await prisma.apiKey.update({ where: { id }, data: { revokedAt } });
      await prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.user.id,
          action: "api_key.revoke",
          entityType: "ApiKey",
          entityId: id,
          oldValues: { name: existing.name, prefix: existing.prefix },
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        },
      });
    }

    return NextResponse.json({ data: { id, revokedAt } });
  } catch (error) {
    const r = rbacResponse(error);
    if (r) return r;
    console.error("[API_KEYS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
