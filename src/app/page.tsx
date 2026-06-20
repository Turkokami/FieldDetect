import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (user?.role === "TECHNICIAN") redirect("/field");
  if (user?.role === "CUSTOMER") redirect("/portal");

  redirect("/dashboard");
}
