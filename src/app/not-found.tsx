import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
        >
          <span className="text-3xl">🐾</span>
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg font-semibold text-foreground mb-2">Page not found</p>
        <p className="text-sm text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", boxShadow: "0 2px 8px rgba(10,186,181,0.35)" }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
