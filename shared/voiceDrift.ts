/**
 * Voice-drift detection: compare a stored voice profile style against a
 * freshly measured style from recent examples. Produces a human-readable
 * diff for Voice Studio — never auto-applies.
 */

import {
  buildVoiceStyleFromTweets,
  type VoiceStyle,
} from "./voice";

export type DriftSeverity = "none" | "minor" | "major";

export type StyleFieldKey = Exclude<keyof VoiceStyle, "commonPhrases">;

export type StyleFieldDiff = {
  field: StyleFieldKey | "commonPhrases";
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

export type PhraseDelta = {
  added: string[];
  removed: string[];
};

export type VoiceDriftSuggestion = {
  severity: DriftSeverity;
  changedFieldCount: number;
  fields: StyleFieldDiff[];
  phraseDelta: PhraseDelta;
  measuredStyle: VoiceStyle;
  /** One-paragraph summary (LLM or deterministic). */
  summary: string;
  /** Example texts used for the re-measure (newest-first, capped). */
  exampleTexts: string[];
  demo: boolean;
};

export type VoiceDriftCompareInput = {
  storedStyle: VoiceStyle;
  measuredStyle: VoiceStyle;
  exampleTexts?: string[];
  summary?: string | null;
  demo?: boolean;
};

const FIELD_LABELS: Record<StyleFieldKey | "commonPhrases", string> = {
  tone: "Tone",
  sentenceLength: "Sentence length",
  formatting: "Formatting",
  emojiUse: "Emoji use",
  punctuation: "Punctuation",
  readingLevel: "Reading level",
  commonPhrases: "Common phrases",
};

const STYLE_FIELDS: StyleFieldKey[] = [
  "tone",
  "sentenceLength",
  "formatting",
  "emojiUse",
  "punctuation",
  "readingLevel",
];

/** Deterministic sample tweets that drift from a short/plain stored profile. */
export const DEMO_DRIFT_EXAMPLES: string[] = [
  "Hot take: shipping weekly without talking to users is just expensive guessing — the data says 73% of those features die quiet.",
  "Unpopular opinion: your roadmap is a graveyard of assumptions. Ask one customer before the next sprint.",
  "The real question is whether you measured retention before you celebrated the launch metrics.",
  "Talk to users. Build less. Ship the boring version first — then argue with the numbers, not the vibes.",
  "Everyone is wrong about 'move fast' when the feedback loop is closed. Open it. Then move.",
  "I keep seeing teams celebrate vanity dashboards. Ask: did anyone come back on day 7?",
  "Contrarian but true — a 2-week pause to interview five users beats another quarter of feature theater.",
  "Ship the smallest thing that answers a real question. Then let the answers rewrite the plan.",
];

/** Stable short/plain style used as the "stored" side of demo fixtures. */
export const DEMO_STORED_STYLE: VoiceStyle = {
  tone: "conversational and direct",
  sentenceLength: "short and punchy",
  formatting: "plain sentences",
  emojiUse: "none",
  punctuation: "standard",
  readingLevel: "accessible",
  commonPhrases: ["ship it", "talk to users"],
};

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function phrasesEqual(a: string[], b: string[]): boolean {
  const left = new Set(a.map(normalizeLabel).filter(Boolean));
  const right = new Set(b.map(normalizeLabel).filter(Boolean));
  if (left.size !== right.size) return false;
  for (const phrase of left) {
    if (!right.has(phrase)) return false;
  }
  return true;
}

export function computePhraseDelta(
  before: string[],
  after: string[]
): PhraseDelta {
  const beforeSet = new Set(before.map(normalizeLabel).filter(Boolean));
  const afterSet = new Set(after.map(normalizeLabel).filter(Boolean));
  const added: string[] = [];
  const removed: string[] = [];

  for (const phrase of after) {
    const key = normalizeLabel(phrase);
    if (key && !beforeSet.has(key)) added.push(phrase.trim());
  }
  for (const phrase of before) {
    const key = normalizeLabel(phrase);
    if (key && !afterSet.has(key)) removed.push(phrase.trim());
  }

  return { added, removed };
}

export function severityFromChangedCount(changedFieldCount: number): DriftSeverity {
  if (changedFieldCount <= 0) return "none";
  if (changedFieldCount <= 2) return "minor";
  return "major";
}

function formatPhrases(phrases: string[]): string {
  if (phrases.length === 0) return "(none)";
  return phrases.join(", ");
}

function buildDeterministicSummary(
  severity: DriftSeverity,
  fields: StyleFieldDiff[],
  phraseDelta: PhraseDelta
): string {
  if (severity === "none") {
    return "No meaningful voice drift — recent writing still matches this profile.";
  }
  const changed = fields.filter((f) => f.changed && f.field !== "commonPhrases");
  const bits: string[] = [];
  for (const field of changed.slice(0, 3)) {
    bits.push(`${field.label.toLowerCase()} shifted toward “${field.after}”`);
  }
  if (phraseDelta.added.length > 0) {
    bits.push(
      `new phrases showing up: ${phraseDelta.added.slice(0, 3).join(", ")}`
    );
  }
  if (phraseDelta.removed.length > 0) {
    bits.push(
      `phrases fading: ${phraseDelta.removed.slice(0, 3).join(", ")}`
    );
  }
  const lead =
    severity === "major"
      ? "Your recent writing has drifted noticeably from this profile"
      : "Your recent writing shows a mild shift from this profile";
  return bits.length > 0 ? `${lead}: ${bits.join("; ")}.` : `${lead}.`;
}

/**
 * Diff stored vs measured style. Phrase list changes count as one field.
 */
export function compareVoiceStyles(
  input: VoiceDriftCompareInput
): VoiceDriftSuggestion {
  const { storedStyle, measuredStyle } = input;
  const fields: StyleFieldDiff[] = STYLE_FIELDS.map((field) => {
    const before = storedStyle[field];
    const after = measuredStyle[field];
    return {
      field,
      label: FIELD_LABELS[field],
      before,
      after,
      changed: normalizeLabel(before) !== normalizeLabel(after),
    };
  });

  const phraseDelta = computePhraseDelta(
    storedStyle.commonPhrases,
    measuredStyle.commonPhrases
  );
  const phrasesChanged = !phrasesEqual(
    storedStyle.commonPhrases,
    measuredStyle.commonPhrases
  );
  fields.push({
    field: "commonPhrases",
    label: FIELD_LABELS.commonPhrases,
    before: formatPhrases(storedStyle.commonPhrases),
    after: formatPhrases(measuredStyle.commonPhrases),
    changed: phrasesChanged,
  });

  const changedFieldCount = fields.filter((f) => f.changed).length;
  const severity = severityFromChangedCount(changedFieldCount);
  const summary =
    input.summary?.trim() ||
    buildDeterministicSummary(severity, fields, phraseDelta);

  return {
    severity,
    changedFieldCount,
    fields,
    phraseDelta,
    measuredStyle,
    summary,
    exampleTexts: (input.exampleTexts ?? []).map((t) => t.trim()).filter(Boolean),
    demo: Boolean(input.demo),
  };
}

/**
 * Measure style from examples and compare to the stored profile.
 */
export function measureVoiceDrift(args: {
  storedStyle: VoiceStyle;
  examples: string[];
  summary?: string | null;
  demo?: boolean;
}): VoiceDriftSuggestion {
  const cleaned = args.examples.map((t) => t.trim()).filter(Boolean);
  const measuredStyle = buildVoiceStyleFromTweets(cleaned);
  return compareVoiceStyles({
    storedStyle: args.storedStyle,
    measuredStyle,
    exampleTexts: cleaned,
    summary: args.summary,
    demo: args.demo,
  });
}

/** Demo path: deterministic major-ish drift from fixture examples. */
export function demoVoiceDriftSuggestion(
  storedStyle: VoiceStyle = DEMO_STORED_STYLE
): VoiceDriftSuggestion {
  return measureVoiceDrift({
    storedStyle,
    examples: DEMO_DRIFT_EXAMPLES,
    demo: true,
  });
}

/** Fields the user can selectively apply from a suggestion. */
export type ApplyableDriftField =
  | StyleFieldKey
  | "commonPhrases"
  | "examples";

/**
 * Patch a profile style from an accepted suggestion — only selected fields.
 * Never mutates in place; returns the next style (+ optional examples).
 */
export function applyDriftSelection(args: {
  currentStyle: VoiceStyle;
  suggestion: VoiceDriftSuggestion;
  selectedFields: ApplyableDriftField[];
  currentExamples?: string[];
}): { style: VoiceStyle; examples?: string[] } {
  const selected = new Set(args.selectedFields);
  const next: VoiceStyle = { ...args.currentStyle };

  for (const field of STYLE_FIELDS) {
    if (selected.has(field)) {
      next[field] = args.suggestion.measuredStyle[field];
    }
  }
  if (selected.has("commonPhrases")) {
    next.commonPhrases = [...args.suggestion.measuredStyle.commonPhrases];
  }

  const result: { style: VoiceStyle; examples?: string[] } = { style: next };
  if (selected.has("examples") && args.suggestion.exampleTexts.length > 0) {
    result.examples = [...args.suggestion.exampleTexts];
  } else if (args.currentExamples !== undefined) {
    result.examples = args.currentExamples;
  }
  return result;
}
