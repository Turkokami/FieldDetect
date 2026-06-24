import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PortalJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    const { c } = await searchParams;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/portal/join${c ? `?c=${c}` : ""}`)}`);
  }

  const { c: customerId } = await searchParams;

  // Already linked to a customer — just go to portal
  const existingCustomer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (existingCustomer) redirect("/portal");

  if (!customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <h1 className="text-xl font-bold text-foreground">Invalid Portal Link</h1>
          <p className="text-sm text-muted-foreground">
            This link is missing required information. Please ask your service provider for a new portal invite link.
          </p>
        </div>
      </div>
    );
  }

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const clerkEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, clerkUserId: null },
    include: { organization: true },
  });

  let linkError: string | null = null;
  let linked = false;

  if (!customer) {
    linkError = "This invite link has already been used or is no longer valid.";
  } else if (!customer.email) {
    // No email on file — link directly without email check
    await prisma.customer.update({ where: { id: customerId }, data: { clerkUserId: userId } });
    linked = true;
  } else if (!clerkEmail || customer.email.toLowerCase() !== clerkEmail.toLowerCase()) {
    linkError = `This invite was sent to ${customer.email}. Please sign in with that email address to access your portal.`;
  } else {
    await prisma.customer.update({ where: { id: customerId }, data: { clerkUserId: userId } });
    linked = true;
  }

  if (linked) redirect("/portal");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-foreground">Unable to Activate Portal</h1>
        <p className="text-sm text-muted-foreground">{linkError}</p>
        <p className="text-sm text-muted-foreground">
          Signed in as: <strong>{clerkEmail ?? "unknown"}</strong>
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/sign-in"
            className="w-full inline-block px-4 py-2 rounded-lg text-sm font-medium text-white text-center"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            Sign in with a different account
          </Link>
          <p className="text-xs text-muted-foreground">
            Need help? Contact your service provider.
          </p>
        </div>
      </div>
    </div>
  );
}
