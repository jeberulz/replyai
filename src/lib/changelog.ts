// Product changelog — the human-readable record of what shipped and improved
// in ReplyPilot, newest first. This is intentionally NOT a code/commit log:
// each entry describes a user-facing change in plain language.
//
// To add a release: prepend a new object to `CHANGELOG`. Keep `date` in
// `YYYY-MM-DD` (it's formatted for display in the page) and give each change a
// `type` so it renders with the right tag. That's the whole workflow.

export type ChangeType = "new" | "improved" | "fixed";

export type ChangeEntry = {
  type: ChangeType;
  /** One line, sentence case. Lead with the user-visible outcome. */
  title: string;
  /** Optional supporting sentence. Keep it to one. */
  detail?: string;
};

export type ChangelogRelease = {
  /** Human version label, e.g. "0.6". */
  version: string;
  /** ISO date the release went out (YYYY-MM-DD). */
  date: string;
  /** Short editorial title for the release. */
  title: string;
  /** One-sentence summary of the theme. */
  summary: string;
  changes: ChangeEntry[];
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "0.6",
    date: "2026-07-06",
    title: "The split-view workbench",
    summary:
      "Analysis, feed, and drafts move to a two-pane layout so you read on the left and act on the right — without losing your place.",
    changes: [
      {
        type: "new",
        title: "Reply workbench for active analyses",
        detail:
          "The reasoning stays on the left while you draft, rewrite, and preview replies in a dedicated pane on the right.",
      },
      {
        type: "new",
        title: "Feed scanner split into a list and a detail pane",
        detail:
          "Skim scored opportunities on the left, open one on the right to see the angle and start a reply — no full-page reload.",
      },
      {
        type: "new",
        title: "Drafts queue gains a detail pane with a retry flow",
        detail:
          "When a scheduled or published post fails, the reason and a one-click retry now live right next to the draft.",
      },
      {
        type: "improved",
        title: "Panes are resizable and remember their width",
        detail:
          "Drag the divider to fit your screen; each surface keeps its layout the next time you open it.",
      },
    ],
  },
  {
    version: "0.5",
    date: "2026-06-24",
    title: "A feed that learns your voice",
    summary:
      "The scanner gets sharper at finding the right conversations, and every draft you keep or edit teaches your voice profile.",
    changes: [
      {
        type: "new",
        title: "Voice learning loop",
        detail:
          "The replies you keep, edit, or discard quietly refine your voice profile over time — no retraining step.",
      },
      {
        type: "new",
        title: "Goal-tuned generation",
        detail:
          "Lean each batch of options toward what you're going for — reach, replies, or building authority.",
      },
      {
        type: "new",
        title: "Smarter feed scanner",
        detail:
          "Filters, semantic ranking, background research, and an outcome loop surface higher-signal opportunities.",
      },
      {
        type: "improved",
        title: "More relevant, more reliable scans",
        detail:
          "Tighter relevance filtering and steadier token refresh mean fewer off-topic tweets and fewer dropped scans.",
      },
    ],
  },
  {
    version: "0.4",
    date: "2026-06-10",
    title: "Onboarding and Drafts",
    summary:
      "A guided setup gets you to your first reply faster, and drafts finally have a home of their own.",
    changes: [
      {
        type: "new",
        title: "Onboarding wizard and setup checklist",
        detail:
          "A short guided flow connects X, trains your voice, and points you at your first opportunity.",
      },
      {
        type: "new",
        title: "Chat-first home",
        detail:
          "Start from a prompt — paste a tweet or describe what you're looking for — instead of a blank dashboard.",
      },
      {
        type: "new",
        title: "Drafts page",
        detail:
          "Everything you've saved, scheduled, or published now lives in one place with live status.",
      },
    ],
  },
  {
    version: "0.3",
    date: "2026-05-28",
    title: "Model controls and faster analysis",
    summary:
      "Choose the model behind your drafts, analyze without a URL, and see how long it really takes to ship a reply.",
    changes: [
      {
        type: "new",
        title: "Model selector with a per-account default",
        detail:
          "Pick the model that drafts your replies and set a default that sticks.",
      },
      {
        type: "new",
        title: "In-app model evaluation",
        detail:
          "Compare how models handle the same tweet before you commit to one.",
      },
      {
        type: "new",
        title: "Analyze pasted text, not just URLs",
        detail:
          "Drop in the text of a post directly when you don't have — or don't want to fetch — a link.",
      },
      {
        type: "new",
        title: "Time-to-publish metric",
        detail:
          "See how long it takes from opening a conversation to sending a reply.",
      },
      {
        type: "new",
        title: "Privacy Policy and Terms of Service",
      },
    ],
  },
  {
    version: "0.1",
    date: "2026-05-12",
    title: "ReplyPilot launches",
    summary:
      "Find the conversations worth joining on X and draft replies in your own voice — with a human clicking send on every post.",
    changes: [
      {
        type: "new",
        title: "Analyze any tweet",
        detail:
          "Thread context, author stance, opinions already voiced, and the angles nobody has taken yet.",
      },
      {
        type: "new",
        title: "Conversation score",
        detail:
          "A 0–100 “worth replying” read with a plain-language reason — no fake-precision engagement numbers.",
      },
      {
        type: "new",
        title: "Three replies and three quote tweets per request",
        detail:
          "Distinct options, each with a reason it's worth sending, plus a “generate more” button when you want them.",
      },
      {
        type: "new",
        title: "Voice profiles and training",
        detail:
          "Measured from your recent tweets and switchable per account, so drafts read written, not generated.",
      },
      {
        type: "new",
        title: "Rewrite in one click",
        detail:
          "Shorter, funnier, more contrarian, stronger hook, simpler, or more human.",
      },
      {
        type: "new",
        title: "Feed scanner",
        detail:
          "A background scan surfaces scored opportunities on a schedule. Suggestions only — you always click send.",
      },
      {
        type: "new",
        title: "Publishing and scheduling",
        detail:
          "Publish now or schedule for later; statuses update live on the dashboard.",
      },
    ],
  },
];

/** The most recent release — handy for “what's new” badges elsewhere. */
export const LATEST_RELEASE = CHANGELOG[0];

/** Format an ISO `YYYY-MM-DD` date for display, e.g. "July 6, 2026". */
export function formatChangelogDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
