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

  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: {
      _count: { select: { appointments: true, invoices: true, properties: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = row([
    "First Name", "Last Name", "Company", "Email", "Phone",
    "Type", "Billing Address", "City", "State", "Zip",
    "Total Jobs", "Total Invoices", "Properties", "Added On",
  ]);

  const lines = customers.map((c) =>
    row([
      c.firstName, c.lastName, c.companyName ?? "",
      c.email ?? "", c.phone ?? "",
      c.customerType,
      c.billingAddressLine1 ?? "", c.billingCity ?? "", c.billingState ?? "", c.billingZip ?? "",
      c._count.appointments, c._count.invoices, c._count.properties,
      c.createdAt.toISOString().split("T")[0],
    ])
  );

  const csv = [header, ...lines].join("\r\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
    },
  });
}
