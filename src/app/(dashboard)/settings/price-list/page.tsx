import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PriceListClient } from "@/components/settings/price-list-client";

export const metadata = { title: "Price List" };

export default async function PriceListPage() {
  const ctx = await getAuthContext();
  if (!ctx) notFound();

  // Owners and admins edit the list and see cost and margin; everyone else reads prices.
  const canEdit = ctx.user.role === "OWNER" || ctx.user.role === "ADMIN";
  const products = await prisma.product.findMany({
    where: { organizationId: ctx.organization.id, ...(canEdit ? {} : { isActive: true }) },
    select: {
      id: true, sku: true, name: true, category: true, unit: true,
      unitPrice: true, isActive: true, sortOrder: true,
      ...(canEdit ? { unitCost: true } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
        <h1 className="text-2xl font-bold text-foreground mt-1">Price List</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prices used by the exclusion calculator and by tools like the Roof Estimator. Changes apply to new estimates only.
          {canEdit ? " Cost and margin are internal and never shown to customers." : ""}
        </p>
      </div>
      <PriceListClient initialProducts={JSON.parse(JSON.stringify(products))} canEdit={canEdit} />
    </div>
  );
}
