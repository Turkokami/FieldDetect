import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatPhone } from "@/lib/utils";
import { Plus, Building2, Phone, Mail, Calendar } from "lucide-react";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { search = "", page = "1" } = await searchParams;
  const pageNum = parseInt(page);
  const pageSize = 20;
  const skip = (pageNum - 1) * pageSize;

  const where = {
    organizationId: user.organizationId,
    isActive: true,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { companyName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { appointments: true, invoices: true, properties: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  const customerTypeLabel: Record<string, string> = {
    RESIDENTIAL: "Residential",
    COMMERCIAL: "Commercial",
    PROPERTY_MANAGEMENT: "Property Mgmt",
    HOTEL: "Hotel",
    DORMITORY: "Dormitory",
    ASSISTED_LIVING: "Assisted Living",
    GOVERNMENT: "Government",
    OTHER: "Other",
  };

  const customerTypeColor: Record<string, "default" | "secondary" | "info" | "success"> = {
    RESIDENTIAL: "secondary",
    COMMERCIAL: "info",
    PROPERTY_MANAGEMENT: "default",
    HOTEL: "success",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{total} total customers</p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form className="max-w-sm">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search customers..."
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </form>

      {/* Customer grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <Link key={customer.id} href={`/customers/${customer.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
                    </p>
                    {customer.companyName && (
                      <p className="text-sm text-slate-500 truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                    )}
                  </div>
                  <Badge variant={customerTypeColor[customer.customerType] ?? "secondary"} className="ml-2 flex-shrink-0">
                    {customerTypeLabel[customer.customerType] ?? customer.customerType}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>{formatPhone(customer.phone)}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{customer._count.properties} properties</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{customer._count.appointments} jobs</span>
                  </div>
                  <p className="text-xs text-slate-400 ml-auto">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">No customers found</p>
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="h-4 w-4" />
              Add your first customer
            </Link>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers?page=${pageNum - 1}&search=${search}`}>Previous</Link>
              </Button>
            )}
            {pageNum * pageSize < total && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers?page=${pageNum + 1}&search=${search}`}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
