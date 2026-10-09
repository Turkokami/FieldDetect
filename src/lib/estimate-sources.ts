// Display names for Estimate.source. Safe to import from client code.
export const SOURCE_LABELS: Record<string, string> = {
  "roof-estimator": "Roof Estimator",
  "proposal-studio": "Proposal Studio",
  "exclusion-calculator": "Exclusion Calculator",
  manual: "Manual",
};

export function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return SOURCE_LABELS[source] ?? source;
}
