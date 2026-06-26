import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Add Vehicle" };

export default async function NewVehiclePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  if (!["OWNER", "ADMIN"].includes(user.role)) redirect("/vehicles");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/vehicles" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Fleet
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Add Vehicle</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-6">Add Vehicle</h1>
      <VehicleForm />
    </div>
  );
}
