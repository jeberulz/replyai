import { describe, expect, it } from "vitest";
import {
  DEMO_AUTHOR_DOSSIERS,
  demoAuthorDossierByHandle,
  demoAuthorDossierSnippet,
  emptyPostHourCounts,
  formatAuthorDossierSnippet,
  formatCadenceHint,
  mergeAuthorUpsert,
  normalizeAuthorHandle,
  peakPostHourUtc,
} from "../shared/authors";

describe("normalizeAuthorHandle", () => {
  it("strips @ and lowercases", () => {
    expect(normalizeAuthorHandle("@SarahBuilds")).toBe("sarahbuilds");
  });
});

describe("mergeAuthorUpsert", () => {
  it("creates a dossier on first sent interaction", () => {
    const merged = mergeAuthorUpsert(null, {
      kind: "sent",
      at: 1_000,
      authorHandle: "@SarahBuilds",
      authorName: "Sarah Chen",
      topic: "AI moats",
      replySettings: "everyone",
      postedAt: Date.UTC(2026, 0, 1, 13, 0, 0),
    });

    expect(merged.authorHandle).toBe("sarahbuilds");
    expect(merged.authorName).toBe("Sarah Chen");
    expect(merged.interactionCount).toBe(1);
    expect(merged.sentCount).toBe(1);
    expect(merged.responseCount).toBe(0);
    expect(merged.lastSentAt).toBe(1_000);
    expect(merged.topicsResponded).toEqual([]);
    expect(merged.replySettingsHistory).toEqual([
      { settings: "everyone", seenAt: 1_000 },
    ]);
    expect(merged.postHourCounts[13]).toBe(1);
  });

  it("increments response count without double-counting send", () => {
    const afterSent = mergeAuthorUpsert(null, {
      kind: "sent",
      at: 1_000,
      authorHandle: "sarahbuilds",
      topic: "ignored-on-sent",
      replySettings: "everyone",
    });
    const afterResponded = mergeAuthorUpsert(afterSent, {
      kind: "responded",
      at: 2_000,
      authorHandle: "sarahbuilds",
      topic: "AI moats",
      replySettings: "following",
    });

    expect(afterResponded.interactionCount).toBe(1);
    expect(afterResponded.sentCount).toBe(1);
    expect(afterResponded.responseCount).toBe(1);
    expect(afterResponded.lastRespondedAt).toBe(2_000);
    expect(afterResponded.topicsResponded).toEqual(["AI moats"]);
    expect(afterResponded.replySettingsHistory.map((e) => e.settings)).toEqual([
      "following",
      "everyone",
    ]);
  });

  it("records a send once when only responded is observed", () => {
    const merged = mergeAuthorUpsert(null, {
      kind: "responded",
      at: 3_000,
      authorHandle: "marcusship",
      topic: "shipping speed",
    });

    expect(merged.sentCount).toBe(1);
    expect(merged.responseCount).toBe(1);
    expect(merged.interactionCount).toBe(1);
    expect(merged.topicsResponded).toEqual(["shipping speed"]);
  });

  it("keeps topic history unique and newest-first within limit", () => {
    let state = mergeAuthorUpsert(null, {
      kind: "responded",
      at: 1,
      authorHandle: "a",
      topic: "one",
    });
    state = mergeAuthorUpsert(state, {
      kind: "responded",
      at: 2,
      authorHandle: "a",
      topic: "two",
    });
    state = mergeAuthorUpsert(state, {
      kind: "responded",
      at: 3,
      authorHandle: "a",
      topic: "one",
    });

    expect(state.topicsResponded[0]).toBe("one");
    expect(state.topicsResponded).toEqual(["one", "two"]);
  });
});

describe("formatAuthorDossierSnippet", () => {
  it("formats observed response counts without fake scores", () => {
    const hours = emptyPostHourCounts();
    hours[13] = 4;
    expect(
      formatAuthorDossierSnippet({
        authorHandle: "sarahbuilds",
        responseCount: 2,
        topicsResponded: ["AI moats"],
        postHourCounts: hours,
      })
    ).toMatch(/you've had 2 responses from @sarahbuilds/);
    expect(
      formatAuthorDossierSnippet({
        authorHandle: "sarahbuilds",
        responseCount: 2,
        topicsResponded: ["AI moats"],
        postHourCounts: hours,
      })
    ).not.toMatch(/%|engagement|score/i);
  });

  it("returns null when there are no responses", () => {
    expect(
      formatAuthorDossierSnippet({
        authorHandle: "nobody",
        responseCount: 0,
        topicsResponded: [],
        postHourCounts: emptyPostHourCounts(),
      })
    ).toBeNull();
  });
});

describe("cadence helpers", () => {
  it("picks the peak UTC hour", () => {
    const hours = emptyPostHourCounts();
    hours[9] = 1;
    hours[14] = 5;
    expect(peakPostHourUtc(hours)).toBe(14);
  });

  it("formats an ET-ish cadence hint from observed hours", () => {
    const hours = emptyPostHourCounts();
    hours[13] = 3;
    expect(formatCadenceHint(hours)).toMatch(/often posts around \d+(am|pm) ET/);
  });
});

describe("demo author dossiers", () => {
  it("covers primary demo handles with response history", () => {
    const handles = DEMO_AUTHOR_DOSSIERS.map((d) => d.authorHandle);
    expect(handles).toEqual(
      expect.arrayContaining(["sarahbuilds", "marcusship", "priyaml"])
    );
    for (const handle of handles) {
      const dossier = demoAuthorDossierByHandle(handle, 1_700_000_000_000);
      expect(dossier?.responseCount).toBeGreaterThan(0);
      const snippet = demoAuthorDossierSnippet(handle, 1_700_000_000_000);
      expect(snippet).toMatch(/you've had \d+ responses? from @/);
    }
  });
});
