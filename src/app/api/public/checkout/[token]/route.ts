import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { paymentToken: token },
      include: { customer: true, organization: true },
    });

    if (!invoice) return NextResponse.json({ error: "Payment link not found or expired" }, { status: 404 });

    const remaining = Number(invoice.balanceDue);
    if (remaining <= 0) {
      return NextResponse.json({ error: "This invoice has already been paid" }, { status: 400 });
    }

    if (["CANCELLED", "REFUNDED"].includes(invoice.status)) {
      return NextResponse.json({ error: "This invoice is no longer payable" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Online payments not configured. Please contact us." }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
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
              description: `${invoice.organization.name} — Payment for services rendered`,
            },
            unit_amount: Math.round(remaining * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        organizationId: invoice.organizationId,
      },
      success_url: `${appUrl}/pay/${token}?payment=success`,
      cancel_url: `${appUrl}/pay/${token}`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    console.error("[PUBLIC_CHECKOUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
