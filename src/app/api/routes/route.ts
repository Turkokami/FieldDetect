import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    routeOrder: z.number().int(),
    technicianId: z.string().nullable().optional(),
  })).min(1),
});

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN", "TECHNICIAN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = reorderSchema.parse(body);

    // Verify all appointments belong to this org
    const ids = updates.map((u) => u.id);
    const count = await prisma.appointment.count({
      where: { id: { in: ids }, organizationId: user.organizationId },
    });
    if (count !== ids.length) {
      return NextResponse.json({ error: "One or more appointments not found" }, { status: 404 });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.appointment.update({
          where: { id: u.id },
          data: {
            routeOrder: u.routeOrder,
            ...(u.technicianId !== undefined && { technicianId: u.technicianId }),
          },
        })
      )
    );

    return NextResponse.json({ data: { updated: updates.length } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[ROUTES_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
