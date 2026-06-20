import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;
        if (!invoiceId) break;

        const amount = (session.amount_total ?? 0) / 100;

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              invoiceId,
              amount,
              method: "STRIPE",
              stripePaymentId: session.payment_intent as string,
              status: "COMPLETED",
              processedAt: new Date(),
            },
          });

          const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
          if (!invoice) return;

          const newPaid = Number(invoice.paidAmount) + amount;
          const newBalance = Number(invoice.totalAmount) - newPaid;
          const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: Math.max(0, newBalance),
              status: newStatus,
              paidAt: newStatus === "PAID" ? new Date() : undefined,
            },
          });
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoiceId;
        if (!invoiceId) break;

        await prisma.payment.updateMany({
          where: { stripePaymentId: pi.id },
          data: { status: "FAILED" },
        });
        break;
      }

      case "invoice.paid": {
        // Stripe subscription invoices (for SaaS billing)
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const customerId = stripeInvoice.customer as string;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { settings: { plan: "PROFESSIONAL" } },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { settings: { plan: "TRIAL" } },
        });
        break;
      }
    }
  } catch (error) {
    console.error(`[STRIPE_WEBHOOK] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
