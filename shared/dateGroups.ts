/** Start of local calendar day in ms (local timezone). */
export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type RelativeDayGroups<T> = {
  today: T[];
  yesterday: T[];
  earlier: T[];
};

/** Bucket items by createdAt into Today / Yesterday / Earlier. */
export function groupByRelativeDay<T>(
  items: T[],
  getTimestamp: (item: T) => number,
  now = Date.now()
): RelativeDayGroups<T> {
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86_400_000;

  const groups: RelativeDayGroups<T> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const item of items) {
    const ts = getTimestamp(item);
    if (ts >= todayStart) {
      groups.today.push(item);
    } else if (ts >= yesterdayStart) {
      groups.yesterday.push(item);
    } else {
      groups.earlier.push(item);
    }
  }

  return groups;
}
