import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const upsertSchema = z.object({
  type: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requirePermission("settings:read");
    const templates = await prisma.notificationTemplate.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    });
    return NextResponse.json({ data: templates });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requirePermission("settings:write");
    const body = await req.json();
    const validated = upsertSchema.parse(body);

    const template = await prisma.notificationTemplate.upsert({
      where: {
        organizationId_type_channel: {
          organizationId: ctx.organization.id,
          type: validated.type as never,
          channel: validated.channel,
        },
      },
      update: {
        subject: validated.subject ?? null,
        body: validated.body,
        isActive: validated.isActive ?? true,
      },
      create: {
        organizationId: ctx.organization.id,
        type: validated.type as never,
        channel: validated.channel,
        subject: validated.subject ?? null,
        body: validated.body,
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json({ data: template });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
