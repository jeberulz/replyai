"use client";

import { useState, type ComponentProps } from "react";
import { Copy, History, Star } from "lucide-react";

import { AuthorDossier } from "@/components/app/author-dossier";
import { ModelEval } from "@/components/app/model-eval";
import { OptionsPanel } from "@/components/app/options-panel";
import type { Option } from "@/components/app/option-card";
import { Banner } from "@/components/ds/banner";
import { ProgressBar } from "@/components/ds/progress-bar";
import { Spinner } from "@/components/ds/spinner";
import {
  Pane,
  PaneActionBar,
  PaneBody,
  PaneEyebrow,
  PaneHeader,
  PaneTabPill,
  PaneTitleRow,
  SegmentedToggle,
} from "@/components/app/split/pane-chrome";
import { XLogo } from "@/components/app/x-logo";
import { TweetBlock } from "./blocks/tweet-block";
import { ReplyPreview } from "./reply-preview";

type WorkbenchView = "options" | "preview";

type TweetSnapshot = ComponentProps<typeof TweetBlock>["tweet"];

export function ReplyWorkbench({
  analysisId,
  tweet,
  tweetUrl,
  status,
  targetTweetId,
  targetTweetUrl,
  voiceProfiles,
  options,
  isDemo,
  defaultModel,
  apiNotice,
  restrictionWarning,
  you,
}: {
  analysisId: string;
  tweet: TweetSnapshot;
  tweetUrl?: string;
  status: string;
  targetTweetId: string;
  targetTweetUrl: string;
  voiceProfiles: { _id: string; name: string; isDefault: boolean }[];
  options: Option[];
  isDemo: boolean;
  defaultModel?: string;
  apiNotice: string | null;
  restrictionWarning: string | null;
  you: { name: string; handle: string };
}) {
  const [view, setView] = useState<WorkbenchView>("options");
  const hasOptions = options.length > 0;
  const focused =
    options.find((o) => o.kind === "reply") ?? options[0] ?? null;

  return (
    <Pane>
      <PaneHeader
        tab={
          <PaneTabPill icon={<XLogo className="size-3.5" />}>
            Reply to @{tweet.authorHandle}
          </PaneTabPill>
        }
        actions={
          <>
            <History className="size-[17px]" />
            <Copy className="size-[17px]" />
            <Star className="size-[17px]" />
          </>
        }
      />
      <PaneTitleRow title="Draft replies">
        <SegmentedToggle
          value={view}
          onValueChange={setView}
          options={[
            { value: "options", label: "Options" },
            { value: "preview", label: "Preview" },
          ]}
        />
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        {view === "preview" && focused ? (
          <ReplyPreview
            author={{ name: tweet.authorName, handle: tweet.authorHandle }}
            tweetText={tweet.text}
            you={you}
            replyText={focused.content}
          />
        ) : (
          <>
            <div className="space-y-2">
              <PaneEyebrow>Replying to</PaneEyebrow>
              <TweetBlock tweet={tweet} tweetUrl={tweetUrl} />
            </div>

            <AuthorDossier authorHandle={tweet.authorHandle} compact />

            {apiNotice && (
              <Banner
                status="info"
                title="Publish note"
                description={apiNotice}
              />
            )}
            {restrictionWarning && (
              <Banner
                status="warning"
                title="Reply restriction"
                description={restrictionWarning}
              />
            )}

            <OptionsPanel
              analysisId={analysisId}
              targetTweetId={targetTweetId}
              targetTweetUrl={targetTweetUrl}
              voiceProfiles={voiceProfiles}
              initialOptions={options}
              isDemo={isDemo}
              defaultModel={defaultModel}
            />

            {status === "generating" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner size="sm" />
                  Still drafting the remaining options…
                </div>
                <ProgressBar
                  label="Drafting options"
                  isLabelHidden
                  isIndeterminate
                  variant="accent"
                />
              </div>
            )}

            {status === "complete" && hasOptions && (
              <ModelEval analysisId={analysisId} defaultModel={defaultModel} />
            )}
          </>
        )}
      </PaneBody>

      <PaneActionBar
        note={
          <>
            <span className="mt-0.5 text-primary">●</span>
            Nothing is posted without your explicit click on that specific reply.
          </>
        }
      >
        <span className="text-xs text-muted-foreground">
          {hasOptions
            ? `${options.filter((o) => o.kind === "reply").length} replies · ${options.filter((o) => o.kind === "quote").length} quote tweets ready`
            : "Drafting options…"}
        </span>
      </PaneActionBar>
    </Pane>
  );
}
