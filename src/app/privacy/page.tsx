import Link from "next/link";

export const metadata = { title: "Privacy Policy – FieldDetect" };

export default function PrivacyPage() {
  const effective = "June 24, 2026";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="w-7 h-7 rounded-lg bg-[#0ABAB5] flex items-center justify-center text-white text-sm">🐾</span>
            FieldDetect
          </Link>
          <span className="text-muted-foreground text-sm">/ Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Effective date: {effective}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          FieldDetect (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our Service.
        </p>

        {[
          {
            title: "1. Information We Collect",
            body: `We collect information you provide directly (account registration details, inspection data, customer records, payment information), information collected automatically (IP address, browser type, pages visited, device identifiers), and information from third-party services you connect (Stripe for payments, Clerk for authentication).`,
          },
          {
            title: "2. How We Use Your Information",
            body: `We use your information to: provide, maintain, and improve the Service; process transactions; send service notifications and updates; respond to your requests; comply with legal obligations; detect and prevent fraud; and analyze usage patterns to improve user experience.`,
          },
          {
            title: "3. Data Storage and Security",
            body: `Your data is stored on secure cloud infrastructure. We implement industry-standard security measures including encryption in transit (TLS) and at rest. Access to data is restricted to authorized personnel. However, no method of transmission over the internet is 100% secure.`,
          },
          {
            title: "4. Data Sharing",
            body: `We do not sell your personal information. We may share information with: service providers who help us operate the Service (database hosting, email delivery, payment processing); legal authorities when required by law; and successors in a business transaction (merger, acquisition).`,
          },
          {
            title: "5. Your Customer Data",
            body: `Data you enter about your customers (inspection records, contact information, property details) is owned by you. We process this data only to provide the Service. You can export or delete your customer data at any time.`,
          },
          {
            title: "6. Cookies and Tracking",
            body: `We use cookies and similar technologies to maintain your session, remember your preferences, and analyze usage. You can control cookies through your browser settings. Disabling cookies may affect Service functionality.`,
          },
          {
            title: "7. Data Retention",
            body: `We retain your data for as long as your account is active or as needed to provide the Service. After account termination, data is retained for 30 days before deletion. Some data may be retained longer where required by law.`,
          },
          {
            title: "8. Your Rights",
            body: `Depending on your location, you may have rights to access, correct, delete, or export your personal data. To exercise these rights, contact us at privacy@fielddetect.com. We will respond within 30 days.`,
          },
          {
            title: "9. Children's Privacy",
            body: `The Service is not directed to children under 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.`,
          },
          {
            title: "10. Third-Party Services",
            body: `The Service integrates with third-party services including Stripe (payments), Clerk (authentication), Resend (email), and UploadThing (file storage). Each third party has its own privacy policy that governs their collection and use of your information.`,
          },
          {
            title: "11. Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the Service at least 30 days before they take effect.`,
          },
          {
            title: "12. Contact Us",
            body: `For privacy-related questions or to exercise your rights, contact us at privacy@fielddetect.com or write to: FieldDetect, Privacy Team, [Your Business Address].`,
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
