import type { EstimateEventType, Prisma } from "@prisma/client";

// Summaries for the estimate Activity panel. Section indexes match the public
// page: 0 summary, 1..n presentation sections, then pricing, then accept.

export type ActivityEvent = {
  id: string;
  type: EstimateEventType;
  sessionId: string | null;
  section: number | null;
  seconds: number | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export function sectionNames(presentation: Prisma.JsonValue | null): string[] {
  const sections =
    presentation && typeof presentation === "object" && !Array.isArray(presentation) &&
    Array.isArray((presentation as { sections?: unknown }).sections)
      ? ((presentation as { sections: { title?: unknown; key?: unknown }[] }).sections)
      : [];
  return [
    "Summary",
    ...sections.map((s, i) => (typeof s?.title === "string" && s.title) || (typeof s?.key === "string" && s.key) || `Section ${i + 1}`),
    "Pricing",
    "Accept",
  ];
}

export function summarizeActivity(events: ActivityEvent[], names: string[]) {
  const opens = events.filter((e) => e.type === "OPENED");
  const views = events.filter((e) => e.type === "OPENED" || e.type === "SECTION_VIEW");
  const byTime = (a: ActivityEvent, b: ActivityEvent) => a.createdAt.getTime() - b.createdAt.getTime();

  const secondsBySection = new Map<number, number>();
  for (const e of events) {
    if (e.type !== "SECTION_VIEW" || e.section == null) continue;
    secondsBySection.set(e.section, (secondsBySection.get(e.section) ?? 0) + (e.seconds ?? 0));
  }

  return {
    firstOpenedAt: opens.length ? [...opens].sort(byTime)[0].createdAt : null,
    lastViewedAt: views.length ? [...views].sort(byTime)[views.length - 1].createdAt : null,
    totalOpens: opens.length,
    distinctViewers: new Set(opens.map((e) => e.sessionId).filter(Boolean)).size,
    sections: [...secondsBySection.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, seconds]) => ({ index, name: names[index] ?? `Section ${index + 1}`, seconds })),
    timeline: [...events]
      .sort((a, b) => byTime(b, a))
      .slice(0, 100)
      .map((e) => ({
        id: e.id,
        type: e.type,
        at: e.createdAt,
        section: e.section != null ? names[e.section] ?? `Section ${e.section + 1}` : null,
        seconds: e.seconds,
        viewer: e.sessionId ? e.sessionId.slice(0, 6) : null,
        ip: e.ip,
        device: describeDevice(e.userAgent),
      })),
  };
}

export type ActivitySummary = ReturnType<typeof summarizeActivity>;

function describeDevice(ua: string | null): string | null {
  if (!ua) return null;
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  return [browser, os].filter(Boolean).join(" on ") || null;
}

/** Viewed in the last 24 hours and not yet accepted/declined: worth a call. */
export const HOT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const NOT_HOT_STATUSES = ["ACCEPTED", "CONVERTED", "DECLINED", "EXPIRED"] as const;

/** Start of the "hot" window, i.e. 24 hours ago. */
export function hotSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - HOT_WINDOW_MS);
}
