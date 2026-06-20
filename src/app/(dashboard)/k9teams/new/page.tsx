import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewK9TeamForm } from "@/components/k9teams/new-k9team-form";

export const metadata = { title: "New K9 Team" };

export default async function NewK9TeamPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  if (!["OWNER", "ADMIN"].includes(user.role)) redirect("/k9teams");

  const technicians = await prisma.user.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return <NewK9TeamForm technicians={technicians} />;
}
