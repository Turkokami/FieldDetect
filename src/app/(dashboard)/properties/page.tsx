import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = parseInt(sp.page ?? "1");
  const pageSize = 24;

  const where = {
    organizationId: user.organizationId,
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { addressLine1: { contains: search, mode: "insensitive" as const } },
        { city: { contains: search, mode: "insensitive" as const } },
        { customer: { firstName: { contains: search, mode: "insensitive" as const } } },
        { customer: { lastName: { contains: search, mode: "insensitive" as const } } },
        { customer: { companyName: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        _count: { select: { units: true, appointments: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const TYPE_LABELS: Record<string, string> = {
    SINGLE_FAMILY: "Single Family",
    MULTI_FAMILY: "Multi-Family",
    APARTMENT_COMPLEX: "Apartment",
    CONDOMINIUM: "Condo",
    HOTEL: "Hotel",
    MOTEL: "Motel",
    DORMITORY: "Dormitory",
    ASSISTED_LIVING: "Assisted Living",
    NURSING_HOME: "Nursing Home",
    OFFICE: "Office",
    WAREHOUSE: "Warehouse",
    RETAIL: "Retail",
    RESTAURANT: "Restaurant",
    SCHOOL: "School",
    HOSPITAL: "Hospital",
    GOVERNMENT: "Government",
    OTHER: "Other",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} properties</p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Property
        </Link>
      </div>

      <div>
        <form method="get">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search properties, addresses, or customers..."
            className="w-full max-w-lg h-10 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </form>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">🏢</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term" : "Add a property to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {property.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {property.customer?.companyName ??
                      `${property.customer?.firstName} ${property.customer?.lastName}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground ml-2 shrink-0">
                  {TYPE_LABELS[property.propertyType] ?? property.propertyType}
                </span>
              </div>

              <p className="text-sm text-foreground">
                {property.addressLine1}
              </p>
              <p className="text-sm text-muted-foreground">
                {property.city}, {property.state} {property.zip}
              </p>

              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                {property._count.units > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">{property._count.units}</div>
                    <div className="text-xs text-muted-foreground">Units</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{property._count.appointments}</div>
                  <div className="text-xs text-muted-foreground">Appts</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`?search=${search}&page=${page - 1}`}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?search=${search}&page=${page + 1}`}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
