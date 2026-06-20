import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 shrink-0 p-10"
        style={{ background: "linear-gradient(180deg, #0A0F1A 0%, #0D1A1F 100%)" }}
      >
        <div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-8"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white text-xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">FieldDetect</h1>
          <p className="text-sm" style={{ color: "#0ABAB5" }}>K9 Inspection Command Center</p>
        </div>

        <div className="space-y-6">
          {[
            { icon: "🐕", title: "K9-Optimized Workflow", desc: "Unit-by-unit result recording built for handlers in the field" },
            { icon: "📋", title: "Instant Reports", desc: "Professional PDF reports generated automatically after every inspection" },
            { icon: "💳", title: "Integrated Invoicing", desc: "Send invoices and accept payments without leaving the app" },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{f.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#527D7A" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: "#2D4A47" }}>
          © {new Date().getFullYear()} FieldDetect. All rights reserved.
        </p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white">🐾</span>
          </div>
          <span className="font-bold text-foreground">FieldDetect</span>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full max-w-sm",
              card: "shadow-lg border border-border rounded-xl",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "border-border",
              formFieldInput: "border-border bg-background",
              footerActionLink: "text-primary",
            },
          }}
        />
      </div>
    </div>
  );
}
