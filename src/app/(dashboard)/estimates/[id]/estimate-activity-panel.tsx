"use client";

type Activity = {
  firstOpenedAt: string | null;
  lastViewedAt: string | null;
  totalOpens: number;
  distinctViewers: number;
  sections: { index: number; name: string; seconds: number }[];
  timeline: {
    id: string;
    type: "OPENED" | "SECTION_VIEW" | "ACCEPTED" | "DECLINED";
    at: string;
    section: string | null;
    seconds: number | null;
    viewer: string | null;
    ip: string | null;
    device: string | null;
  }[];
};

type Acceptance = {
  acceptedAt: string | null;
  acceptedByName: string | null;
  acceptedByTitle: string | null;
  acceptedIp: string | null;
  signatureDataUrl: string | null;
};

const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m < 60 ? `${m}m ${s}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const EVENT_LABEL: Record<Activity["timeline"][number]["type"], string> = {
  OPENED: "Opened",
  SECTION_VIEW: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

export function EstimateActivityPanel({ activity, acceptance }: { activity: Activity; acceptance: Acceptance }) {
  const maxSeconds = Math.max(1, ...activity.sections.map((s) => s.seconds));
  const hasViews = activity.totalOpens > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Activity</h2>
      </div>

      {!hasViews && !acceptance.acceptedAt ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No views yet. Activity appears here once the customer opens their estimate link.
        </p>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="First opened" value={when(activity.firstOpenedAt)} />
            <Stat label="Last viewed" value={when(activity.lastViewedAt)} />
            <Stat label="Viewers" value={String(activity.distinctViewers)} />
            <Stat label="Opens" value={String(activity.totalOpens)} />
          </div>

          {activity.sections.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Time per section</h3>
              <ul className="space-y-1.5">
                {activity.sections.map((s) => (
                  <li key={s.index} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm">
                    <span className="truncate text-foreground">{s.name}</span>
                    <span className="h-2 rounded-full bg-muted overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(4, (s.seconds / maxSeconds) * 100)}%`, background: "#0ABAB5" }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{duration(s.seconds)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acceptance.acceptedAt && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <div className="font-semibold">
                Accepted by {acceptance.acceptedByName ?? "customer"}
                {acceptance.acceptedByTitle ? `, ${acceptance.acceptedByTitle}` : ""}
              </div>
              <div className="text-xs mt-0.5">
                {when(acceptance.acceptedAt)}{acceptance.acceptedIp ? ` · IP ${acceptance.acceptedIp}` : ""}
              </div>
              {acceptance.signatureDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={acceptance.signatureDataUrl} alt="Customer signature" className="mt-3 max-h-24 rounded bg-white border border-green-200 p-1" />
              )}
            </div>
          )}

          {activity.timeline.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timeline</h3>
              <ol className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {activity.timeline.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums pt-0.5">{when(e.at)}</span>
                    <span className="min-w-0">
                      <span className={e.type === "ACCEPTED" ? "text-green-700 font-semibold" : e.type === "DECLINED" ? "text-red-600 font-semibold" : "text-foreground"}>
                        {EVENT_LABEL[e.type]}
                      </span>
                      {e.section && <span className="text-muted-foreground"> {e.section}</span>}
                      {e.seconds ? <span className="text-muted-foreground"> · {duration(e.seconds)}</span> : null}
                      <span className="block text-xs text-muted-foreground truncate">
                        {[e.viewer && `viewer ${e.viewer}`, e.device, e.ip].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}
