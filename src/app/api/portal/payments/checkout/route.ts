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

    const customer = await prisma.customer.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const body = await req.json();
    const { invoiceId } = schema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, customerId: customer.id },
      include: { lineItems: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const remaining = Number(invoice.balanceDue);
    if (remaining <= 0) {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Online payments not configured. Please contact us to arrange payment." }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customer.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice #${invoice.invoiceNumber}`,
              description: `${customer.organization.name} — Payment for services rendered`,
            },
            unit_amount: Math.round(remaining * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        customerId: customer.id,
        organizationId: customer.organizationId,
      },
      success_url: `${appUrl}/portal/invoices/${invoiceId}?payment=success`,
      cancel_url: `${appUrl}/portal/invoices/${invoiceId}`,
    });

    return NextResponse.json({ data: { url: session.url, sessionId: session.id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PORTAL_STRIPE_CHECKOUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
