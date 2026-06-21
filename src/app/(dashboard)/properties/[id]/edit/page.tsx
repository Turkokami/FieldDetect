import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/properties/property-form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { customer: { select: { firstName: true, lastName: true, companyName: true } } },
  });

  if (!property) notFound();

  const customerName = property.customer.companyName
    ?? `${property.customer.firstName} ${property.customer.lastName}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/properties/${id}`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Property</h1>
      </div>

      <PropertyForm
        propertyId={id}
        customerName={customerName}
        defaultValues={{
          name: property.name,
          propertyType: property.propertyType,
          addressLine1: property.addressLine1,
          addressLine2: property.addressLine2,
          city: property.city,
          state: property.state,
          zip: property.zip,
          totalUnits: property.totalUnits,
          totalBuildings: property.totalBuildings,
          accessNotes: property.accessNotes,
          gateCode: property.gateCode,
          parkingNotes: property.parkingNotes,
          notes: property.notes,
        }}
      />
    </div>
  );
}
