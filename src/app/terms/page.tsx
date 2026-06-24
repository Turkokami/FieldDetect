import Link from "next/link";

export const metadata = { title: "Terms of Service – FieldDetect" };

export default function TermsPage() {
  const effective = "June 24, 2026";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="w-7 h-7 rounded-lg bg-[#0ABAB5] flex items-center justify-center text-white text-sm">🐾</span>
            FieldDetect
          </Link>
          <span className="text-muted-foreground text-sm">/ Terms of Service</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-2">Effective date: {effective}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Please read these Terms of Service (&quot;Terms&quot;) carefully before using FieldDetect (&quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms.
        </p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By creating an account or using FieldDetect, you agree to these Terms and our Privacy Policy. If you are using the Service on behalf of a business, you represent that you have authority to bind that business to these Terms.`,
          },
          {
            title: "2. Description of Service",
            body: `FieldDetect is a field inspection management platform designed for K9 detection service companies. The Service includes scheduling, inspection recording, reporting, invoicing, customer management, and related features.`,
          },
          {
            title: "3. Account Registration",
            body: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must promptly notify us of any unauthorized use of your account.`,
          },
          {
            title: "4. Acceptable Use",
            body: `You agree not to use the Service to: (a) violate any applicable law or regulation; (b) transmit any harmful, offensive, or unauthorized content; (c) attempt to gain unauthorized access to any part of the Service; (d) interfere with or disrupt the Service; (e) use the Service to compete with FieldDetect.`,
          },
          {
            title: "5. Subscription and Billing",
            body: `Paid plans are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days' notice. Failure to pay may result in suspension or termination of your account.`,
          },
          {
            title: "6. Data and Privacy",
            body: `You retain ownership of all data you upload to the Service. By using the Service, you grant us a limited license to process your data solely to provide the Service. We will handle your data in accordance with our Privacy Policy.`,
          },
          {
            title: "7. Intellectual Property",
            body: `The Service, including its software, design, and content, is owned by FieldDetect and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute any part of the Service without our written permission.`,
          },
          {
            title: "8. Disclaimers",
            body: `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. USE OF THE SERVICE IS AT YOUR OWN RISK.`,
          },
          {
            title: "9. Limitation of Liability",
            body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, FIELDDETECT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE TWELVE MONTHS PRECEDING THE CLAIM.`,
          },
          {
            title: "10. Termination",
            body: `Either party may terminate the agreement at any time. Upon termination, your right to use the Service ceases. We will retain your data for 30 days after termination, after which it may be permanently deleted.`,
          },
          {
            title: "11. Changes to Terms",
            body: `We may update these Terms from time to time. We will notify you of material changes by email or through the Service. Continued use after changes constitutes acceptance of the updated Terms.`,
          },
          {
            title: "12. Contact",
            body: `For questions about these Terms, contact us at support@fielddetect.com.`,
          },
        ].map(({ title, body }) => (
          <section key={title}>
            <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </section>
        ))}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 flex gap-6 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
