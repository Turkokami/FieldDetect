"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-destructive/10">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 h-9 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
