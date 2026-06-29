import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VialForm } from "@/components/vials/vial-form";

export const metadata = { title: "Edit Vial" };

export default async function EditVialPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user || !["OWNER", "ADMIN"].includes(user.role)) notFound();

  const { id } = await params;

  const vial = await prisma.bedBugVial.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!vial) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Edit Vial</h1>
      <VialForm
        initial={{
          id: vial.id,
          name: vial.name,
          colony: vial.colony,
          source: vial.source,
          acquisitionDate: vial.acquisitionDate.toISOString(),
          status: vial.status,
          notes: vial.notes,
        }}
      />
    </div>
  );
}
