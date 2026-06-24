"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

export function MarkReadButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const mark = async () => {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}/notes-read`, { method: "POST" });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={mark}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground"
    >
      <CheckCheck className="h-3.5 w-3.5" />
      {loading ? "Marking…" : "Mark read"}
    </button>
  );
}
