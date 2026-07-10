/**
 * ReplyPilot app typography — fixed size/leading pairs from Figma ReplyAI
 * frame 379:3874 (insight cards) plus design.md in-app scale.
 *
 * Figma specifies pixel line-heights, not ratios. Import `rpType` in components
 * instead of ad-hoc `text-*` / `leading-*` classes.
 */
export const rpLeading = {
  xs: "1rem", // 16px @ 12px
  sm: "1.25rem", // 20px @ 14px
  meta: "1.125rem", // 18px @ 13px
  base: "1.5rem", // 24px @ 16px
  detail: "1.5rem", // 24px @ 15px
  lg: "1.5rem", // 24px @ 18px
  title: "2rem", // 32px @ 24px serif
  metric: "2.5rem", // 40px @ 40px
  page: "2.125rem", // 34px @ 32px (h1, 2rem with ~1.05)
} as const;

/** Core scale — size utility + matching leading utility */
export const rpType = {
  /** 12px / 16px — eyebrows, captions, section labels */
  xs: "text-xs leading-4",
  xsMedium: "text-xs font-medium leading-4",
  xsUpper: "text-xs uppercase leading-4 tracking-[0.1em]",

  /** 13px / 18px — inline meta, pane pills */
  meta: "text-[13px] leading-[18px]",

  /** 14px / 20px — supporting copy, list labels, mono stats */
  sm: "text-sm leading-5",
  smMedium: "text-sm font-medium leading-5",
  monoSm: "font-mono text-sm leading-5 tabular-nums",
  monoSmSemibold: "font-mono text-sm font-semibold leading-5 tabular-nums",

  /** 15px / 24px — emphasized detail paragraphs (reply budget) */
  detail: "text-[15px] leading-6",

  /** 16px / 24px — default body */
  body: "text-base leading-6",

  /** 18px / 24px — in-card section headings (sans) */
  section: "text-lg font-semibold leading-6",

  /** 24px / 32px — Instrument Serif card + section titles */
  titleSerif: "font-serif text-2xl font-normal leading-8 tracking-[-0.02em]",

  /** 32px / ~34px — page h1 (Instrument Serif) */
  pageTitle: "font-serif text-[2rem] leading-[1.05] tracking-[-0.02em]",

  /** 22px / 32px — workbench pane titles (design.md split view) */
  paneTitle: "font-serif text-[22px] font-normal leading-8 tracking-[-0.02em]",

  /** 40px / 40px — hero metrics */
  heroMetric: "font-mono text-[2.5rem] font-bold leading-10 tabular-nums",

  /** 12px / 16px mono — hour grid, stat strip */
  monoXs: "font-mono text-xs leading-4 tabular-nums",
} as const;

/** Semantic aliases for insight cards (Figma 379:3874) */
export const insightCardType = {
  eyebrow: `${rpType.xsUpper} text-muted-foreground`,
  title: `${rpType.titleSerif} text-foreground`,
  heroMetric: `${rpType.heroMetric} text-foreground`,
  metricCaption: `${rpType.xs} text-muted-foreground`,
  metaLine: `${rpType.meta} text-muted-foreground`,
  bodyDetail: `${rpType.detail} text-muted-foreground`,
  body: `${rpType.body} text-muted-foreground`,
  sectionTitle: `${rpType.section} text-foreground`,
  sectionSubtitle: `${rpType.sm} text-muted-foreground`,
  statusLine: `${rpType.xsMedium} text-foreground`,
  sectionLabel: `${rpType.xs} text-muted-foreground`,
  listLabel: `${rpType.sm} text-foreground`,
  listMeta: `${rpType.xs} text-muted-foreground`,
  listValue: `${rpType.monoSm} text-foreground`,
  windowTime: `${rpType.monoSmSemibold} text-foreground`,
  windowReason: `${rpType.body} text-muted-foreground`,
  hourLabel: `${rpType.monoXs} text-muted-foreground`,
} as const;
