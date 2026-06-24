import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function row(vals: (string | number | null | undefined)[]): string {
  return vals.map(esc).join(",");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inspections = await prisma.inspection.findMany({
    where: { organizationId: user.organizationId },
    include: {
      property: {
        select: {
          name: true, addressLine1: true, city: true, state: true,
          customer: { select: { firstName: true, lastName: true, companyName: true, email: true } },
        },
      },
      technician: { select: { firstName: true, lastName: true } },
      k9Team: { select: { name: true } },
      k9Dog: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const header = row([
    "Inspection #", "Date", "Start Time", "End Time",
    "Property", "Address", "City", "State",
    "Customer", "Customer Email",
    "Technician", "K9 Dog", "K9 Team",
    "Total Units", "Positive", "Negative", "Inconclusive", "Inaccessible",
    "Overall Result", "Follow-Up Required", "Status",
  ]);

  const lines = inspections.map((i) => {
    const cust = i.property.customer;
    return row([
      i.inspectionNumber,
      i.startTime.toISOString().split("T")[0],
      i.startTime.toISOString(),
      i.endTime?.toISOString() ?? "",
      i.property.name,
      i.property.addressLine1,
      i.property.city,
      i.property.state,
      cust.companyName ?? `${cust.firstName} ${cust.lastName}`,
      cust.email,
      i.technician ? `${i.technician.firstName} ${i.technician.lastName}` : "",
      i.k9Dog?.name ?? "",
      i.k9Team?.name ?? "",
      i.totalUnitsInspected,
      i.totalPositive,
      i.totalNegative,
      i.totalInconclusive,
      i.totalInaccessible,
      i.overallResult ?? "",
      i.followUpRequired ? "Yes" : "No",
      i.endTime ? "Complete" : "In Progress",
    ]);
  });

  const csv = [header, ...lines].join("\r\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspections-${date}.csv"`,
    },
  });
}
