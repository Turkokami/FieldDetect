import { describe, expect, it } from "vitest";
import { sectionNames, summarizeActivity, type ActivityEvent } from "@/lib/estimate-activity";

const ev = (over: Partial<ActivityEvent>, minutes: number): ActivityEvent => ({
  id: Math.random().toString(36), type: "OPENED", sessionId: null, section: null, seconds: null,
  ip: null, userAgent: null, createdAt: new Date(Date.UTC(2026, 9, 9, 12, minutes)), ...over,
});

describe("sectionNames", () => {
  it("summary, deck sections, pricing, accept", () => {
    expect(sectionNames({ sections: [{ title: "Cover" }, { key: "program" }, {}] }))
      .toEqual(["Summary", "Cover", "program", "Section 3", "Pricing", "Accept"]);
    expect(sectionNames(null)).toEqual(["Summary", "Pricing", "Accept"]);
  });
});

describe("summarizeActivity", () => {
  it("counts opens and viewers, sums dwell per section, orders the timeline newest first", () => {
    const names = sectionNames(null);
    const s = summarizeActivity([
      ev({ type: "OPENED", sessionId: "a" }, 0),
      ev({ type: "SECTION_VIEW", sessionId: "a", section: 0, seconds: 30 }, 1),
      ev({ type: "SECTION_VIEW", sessionId: "a", section: 1, seconds: 90 }, 3),
      ev({ type: "OPENED", sessionId: "a" }, 10),
      ev({ type: "OPENED", sessionId: "b", userAgent: "Mozilla/5.0 (iPhone) Version/17 Safari/604.1" }, 20),
      ev({ type: "SECTION_VIEW", sessionId: "b", section: 1, seconds: 15 }, 21),
      ev({ type: "ACCEPTED" }, 25),
    ], names);
    expect(s.totalOpens).toBe(3);
    expect(s.distinctViewers).toBe(2);
    expect(s.firstOpenedAt?.getUTCMinutes()).toBe(0);
    expect(s.lastViewedAt?.getUTCMinutes()).toBe(21);
    expect(s.sections).toEqual([{ index: 0, name: "Summary", seconds: 30 }, { index: 1, name: "Pricing", seconds: 105 }]);
    expect(s.timeline[0].type).toBe("ACCEPTED");
    expect(s.timeline.find((t) => t.viewer === "b" && t.type === "OPENED")?.device).toBe("Safari on iOS");
  });
});
