"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

type Props = {
  hasK9Team: boolean;
  hasProperty: boolean;
  hasAppointment: boolean;
  orgId: string;
};

const steps = [
  {
    key: "property" as const,
    label: "Add your first property",
    description: "Create a location where inspections will take place",
    href: "/properties/new",
  },
  {
    key: "k9team" as const,
    label: "Set up a K9 team",
    description: "Create a team with your dogs and handlers",
    href: "/k9teams/new",
  },
  {
    key: "appointment" as const,
    label: "Schedule your first job",
    description: "Book an inspection appointment",
    href: "/scheduling/new",
  },
];

export function GettingStarted({ hasK9Team, hasProperty, hasAppointment, orgId }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `gs_dismissed_${orgId}`;

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(storageKey) === "1") {
      setDismissed(true);
    }
  }, [storageKey]);

  const doneMap = { property: hasProperty, k9team: hasK9Team, appointment: hasAppointment };
  const allDone = hasProperty && hasK9Team && hasAppointment;
  const doneCount = Object.values(doneMap).filter(Boolean).length;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-card border border-primary/20 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60"
        style={{ background: "rgba(10,186,181,0.04)" }}>
        <div>
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
            {allDone ? "🎉 You're all set!" : "Getting Started"}
            {!allDone && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                style={{ background: "#0ABAB5" }}>
                {doneCount}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone ? "All setup steps complete" : `${doneCount} of ${steps.length} complete`}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
        >
          {allDone ? "Dismiss" : "Skip"}
        </button>
      </div>

      <div className="divide-y divide-border/40">
        {steps.map((step) => {
          const done = doneMap[step.key];
          return (
            <div key={step.key}>
              {done ? (
                <div className="flex items-start gap-3 px-5 py-3.5 opacity-60">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" style={{ color: "#0ABAB5" }} />
                  <div>
                    <div className="text-sm font-medium text-foreground line-through">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              ) : (
                <Link href={step.href}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <Circle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                  <span className="text-xs font-medium shrink-0 mt-0.5" style={{ color: "#0ABAB5" }}>→</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
