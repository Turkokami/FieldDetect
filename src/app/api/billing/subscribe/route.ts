import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

export async function POST(req: NextRequest) {
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

    const { plan = "professional" } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: `Price not configured for plan: ${plan}` }, { status: 400 });
    }

    const org = user.organization;
    let stripeCustomerId = org.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { organizationId: org.id },
      });
      stripeCustomerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/settings?billing=success`,
      cancel_url: `${APP_URL}/pricing`,
      subscription_data: {
        metadata: { organizationId: org.id, plan },
      },
      metadata: { organizationId: org.id, plan },
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    console.error("[BILLING_SUBSCRIBE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
