import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const schema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  action: z.enum(["mark_paid", "send"]),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user || !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { ids, action } = schema.parse(body);

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: ids }, organizationId: user.organizationId },
      include: {
        customer: true,
        lineItems: true,
        organization: true,
      },
    });

    if (action === "mark_paid") {
      await prisma.$transaction(
        invoices.map((inv) =>
          prisma.invoice.update({
            where: { id: inv.id },
            data: {
              status: "PAID",
              paidAmount: inv.totalAmount,
              balanceDue: 0,
            },
          })
        )
      );
      return NextResponse.json({ ok: true, processed: invoices.length });
    }

    if (action === "send") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com";
      const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@fielddetect.com";

      // All invoices are from the same org — read CC emails once
      const firstOrg = invoices[0]?.organization;
      const ccEmails: string[] = (firstOrg as { ccEmails?: string[] } | undefined)?.ccEmails ?? [];

      let sent = 0;
      let skipped = 0;

      for (const invoice of invoices) {
        if (!invoice.customer.email) { skipped++; continue; }

        const token = invoice.paymentToken ?? randomBytes(24).toString("hex");
        const paymentUrl = `${appUrl}/pay/${token}`;
        const org = invoice.organization;
        const balanceDue = Number(invoice.balanceDue);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paymentToken: token, stripePaymentUrl: paymentUrl, status: "SENT", sentAt: new Date() },
        });

        const lineRows = invoice.lineItems.map((item) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${item.description}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${Number(item.quantity)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(Number(item.unitPrice))}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${fmt(Number(item.total))}</td>
          </tr>`).join("");

        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px">
    <span style="color:#fff;font-size:20px;font-weight:800">🐾 ${org.name}</span>
  </div>
  <div style="background:#0f172a;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;font-weight:700">Invoice</div>
      <div style="color:#fff;font-size:20px;font-weight:800;font-family:monospace">#${invoice.invoiceNumber}</div>
    </div>
  </div>
  <div style="padding:24px">
    <p style="margin:0 0 16px;color:#374151">Hi ${invoice.customer.firstName},<br><br>Please find your invoice from <strong>${org.name}</strong> below.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tbody>${lineRows}</tbody>
    </table>
    <div style="text-align:right;border-top:2px solid #e2e8f0;padding-top:12px">
      <div style="font-size:18px;font-weight:800;color:#0f172a">Total Due: ${fmt(balanceDue)}</div>
    </div>
  </div>
  <div style="background:#f0fdfa;padding:20px 24px;text-align:center">
    <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ABAB5,#0D9488);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">
      View &amp; Pay Invoice →
    </a>
    <p style="margin:8px 0 0;font-size:11px;color:#94a3b8">Secured by Stripe · No account required</p>
  </div>
</div>
</body></html>`;

        try {
          if (resend) {
            await resend.emails.send({
              from: fromEmail,
              to: invoice.customer.email,
              ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
              subject: `Invoice #${invoice.invoiceNumber} from ${org.name} — ${fmt(Number(invoice.totalAmount))} due`,
              html,
            });
          }
          sent++;
        } catch (err) {
          console.error(`[BULK_SEND] Invoice ${invoice.id}:`, err);
          skipped++;
        }
      }

      return NextResponse.json({ ok: true, sent, skipped });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INVOICES_BULK]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
