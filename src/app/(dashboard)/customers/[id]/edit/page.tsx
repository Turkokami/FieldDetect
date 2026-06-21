import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: user.organizationId },
  });

  if (!customer) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/customers/${id}`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Customer</h1>
      </div>

      <CustomerForm
        customerId={id}
        defaultValues={{
          customerType: customer.customerType as never,
          companyName: customer.companyName ?? undefined,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          altPhone: customer.altPhone ?? undefined,
          billingAddressLine1: customer.billingAddressLine1 ?? undefined,
          billingAddressLine2: customer.billingAddressLine2 ?? undefined,
          billingCity: customer.billingCity ?? undefined,
          billingState: customer.billingState ?? undefined,
          billingZip: customer.billingZip ?? undefined,
          notes: customer.notes ?? undefined,
          referralSource: customer.referralSource ?? undefined,
        }}
      />
    </div>
  );
}
