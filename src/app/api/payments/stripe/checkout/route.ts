import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { z } from "zod";

const schema = z.object({
  invoiceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { invoiceId } = schema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: user.organizationId },
      include: { customer: true, lineItems: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const remaining = Number(invoice.balanceDue);
    if (remaining <= 0) {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: invoice.customer.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice #${invoice.invoiceNumber}`,
              description: "Payment for services rendered",
            },
            unit_amount: Math.round(remaining * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        organizationId: user.organizationId,
      },
      success_url: `${appUrl}/invoices/${invoiceId}?payment=success`,
      cancel_url: `${appUrl}/invoices/${invoiceId}?payment=cancelled`,
    });

    return NextResponse.json({ data: { url: session.url, sessionId: session.id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[STRIPE_CHECKOUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
