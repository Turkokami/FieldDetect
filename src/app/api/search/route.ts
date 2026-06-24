import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ data: { customers: [], properties: [], appointments: [] } });

    const orgId = user.organizationId;
    const search = { contains: q, mode: "insensitive" as const };

    const [customers, properties, appointments] = await Promise.all([
      prisma.customer.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          OR: [
            { firstName: search },
            { lastName: search },
            { companyName: search },
            { email: search },
            { phone: search },
          ],
        },
        select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
        take: 6,
      }),
      prisma.property.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: search },
            { addressLine1: search },
            { city: search },
          ],
        },
        select: {
          id: true, name: true,
          addressLine1: true, city: true, state: true,
          customer: { select: { firstName: true, lastName: true, companyName: true } },
        },
        take: 6,
      }),
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          status: { not: "CANCELLED" },
          OR: [
            { customer: { firstName: search } },
            { customer: { lastName: search } },
            { customer: { companyName: search } },
            { property: { name: search } },
            { property: { addressLine1: search } },
          ],
        },
        select: {
          id: true, serviceType: true, status: true, scheduledDate: true,
          customer: { select: { firstName: true, lastName: true, companyName: true } },
          property: { select: { name: true, city: true } },
        },
        orderBy: { scheduledDate: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({ data: { customers, properties, appointments } });
  } catch (error) {
    console.error("[SEARCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
