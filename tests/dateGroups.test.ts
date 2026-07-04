import { describe, expect, it } from "vitest";
import { groupByRelativeDay, startOfDay } from "../shared/dateGroups";

describe("startOfDay", () => {
  it("returns midnight local time", () => {
    const now = new Date(2026, 6, 4, 15, 30, 0).getTime();
    const start = startOfDay(now);
    const d = new Date(start);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(4);
  });
});

describe("groupByRelativeDay", () => {
  const now = new Date(2026, 6, 4, 12, 0, 0).getTime();
  const todayStart = startOfDay(now);

  it("buckets items into today, yesterday, and earlier", () => {
    const items = [
      { id: "a", at: todayStart + 3_600_000 },
      { id: "b", at: todayStart - 3_600_000 },
      { id: "c", at: todayStart - 86_400_000 - 1 },
    ];

    const groups = groupByRelativeDay(items, (i) => i.at, now);

    expect(groups.today.map((i) => i.id)).toEqual(["a"]);
    expect(groups.yesterday.map((i) => i.id)).toEqual(["b"]);
    expect(groups.earlier.map((i) => i.id)).toEqual(["c"]);
  });
});
