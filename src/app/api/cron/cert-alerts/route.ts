import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fielddetect.com";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization");
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Find certs expired or expiring within 30 days
  const expiringCerts = await prisma.handlerCertification.findMany({
    where: {
      expiresAt: { not: null, lte: in30Days },
      user: { isActive: true },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organizationId: true,
        },
      },
    },
    orderBy: { expiresAt: "asc" },
  });

  if (expiringCerts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No expiring certs" });
  }

  // Group by organization so we send one email per org to admins/owners
  const byOrg = new Map<string, typeof expiringCerts>();
  for (const cert of expiringCerts) {
    const orgId = cert.user.organizationId;
    if (!byOrg.has(orgId)) byOrg.set(orgId, []);
    byOrg.get(orgId)!.push(cert);
  }

  let sent = 0;

  for (const [orgId, certs] of byOrg) {
    const admins = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
      select: { email: true, firstName: true },
    });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const certRows = certs.map((c) => {
      const expired = c.expiresAt && new Date(c.expiresAt) < now;
      const dateStr = c.expiresAt
        ? new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${c.user.firstName} ${c.user.lastName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${c.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${expired ? "#dc2626" : "#ca8a04"};font-weight:600">
          ${expired ? "Expired" : "Expiring Soon"} · ${dateStr}
        </td>
      </tr>`;
    }).join("");

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827;font-weight:700">Handler Certification Alert</h2>
        <p style="color:#374151;margin:0 0 20px;font-size:14px">
          ${certs.length} certification${certs.length !== 1 ? "s" : ""} for ${org?.name ?? "your org"} require${certs.length === 1 ? "s" : ""} attention:
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e5e7eb">Handler</th>
              <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e5e7eb">Certification</th>
              <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e5e7eb">Status</th>
            </tr>
          </thead>
          <tbody>${certRows}</tbody>
        </table>
        <div style="margin-top:20px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com"}/team"
            style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            Manage Team Certifications →
          </a>
        </div>
      </div>
    </div>`;

    for (const admin of admins) {
      if (!admin.email) continue;
      try {
        if (resend) {
          await resend.emails.send({
            from: FROM,
            to: admin.email,
            subject: `⚠️ ${certs.length} Handler Cert${certs.length !== 1 ? "s" : ""} Expiring — ${org?.name}`,
            html,
          });
        }
        sent++;
      } catch (err) {
        console.error("[CERT_ALERT]", err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, certsFound: expiringCerts.length });
}
