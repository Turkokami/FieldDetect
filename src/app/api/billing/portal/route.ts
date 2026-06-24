import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { stripeCustomerId } = user.organization;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${APP_URL}/settings`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    console.error("[BILLING_PORTAL]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
