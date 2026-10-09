import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fielddetect.com";

/**
 * Emails the org's active OWNER and ADMIN users, and texts them too when
 * INTEGRATION_ALERT_SMS=true and Twilio is configured. Never throws: alerts
 * must not fail the request that triggered them.
 */
export async function alertOwners(
  organizationId: string,
  alert: { subject: string; html: string; sms?: string }
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
      select: { email: true, phone: true },
    });
    if (admins.length === 0) return;

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: admins.map((a) => a.email),
        subject: alert.subject,
        html: alert.html,
      });
    } else {
      console.log(`[OWNER_ALERT] Would email ${admins.length} admin(s): ${alert.subject}`);
    }

    if (alert.sms && process.env.INTEGRATION_ALERT_SMS === "true") {
      await Promise.all(admins.filter((a) => a.phone).map((a) => sendSms(a.phone!, alert.sms!)));
    }
  } catch (err) {
    console.error("[OWNER_ALERT] failed", err);
  }
}
