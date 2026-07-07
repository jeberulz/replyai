"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { generateMoreAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { OptionCard, type Option } from "@/components/app/option-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_MODEL_ID, MODELS } from "../../../shared/models";
import type { Id } from "../../../convex/_generated/dataModel";

type VoiceProfile = { _id: string; name: string; isDefault: boolean };

export function OptionsPanel({
  analysisId,
  targetTweetId,
  targetTweetUrl,
  voiceProfiles,
  initialOptions,
  isDemo,
  defaultModel,
}: {
  analysisId: string;
  targetTweetId: string;
  targetTweetUrl: string;
  voiceProfiles: VoiceProfile[];
  initialOptions: Option[];
  isDemo: boolean;
  defaultModel?: string;
}) {
  const sessionToken = useSessionToken();
  const [voiceProfileId, setVoiceProfileId] = useState<string>(
    voiceProfiles.find((p) => p.isDefault)?._id ?? voiceProfiles[0]?._id ?? ""
  );
  const [model, setModel] = useState<string>(defaultModel ?? DEFAULT_MODEL_ID);
  const [pending, startTransition] = useTransition();

  // Live options via Convex reactivity; falls back to server-rendered data
  // until the subscription connects.
  const live = useQuery(
    api.replies.listByAnalysis,
    sessionToken
      ? {
          sessionToken,
          analysisId: analysisId as Id<"tweetAnalyses">,
        }
      : "skip"
  );
  const options: Option[] = (live ?? initialOptions).map((o) => ({
    _id: String(o._id),
    kind: o.kind,
    category: o.category,
    content: o.content,
    reason: o.reason,
    editedBeforeSend: o.editedBeforeSend,
  }));

  const generateMore = (kind: "reply" | "quote") => {
    startTransition(async () => {
      try {
        await generateMoreAction({ analysisId, kind, voiceProfileId, model });
        toast.success("3 more options generated");
      } catch {
        toast.error("Generation failed");
      }
    });
  };

  const renderList = (kind: "reply" | "quote") => {
    const list = options.filter((o) => o.kind === kind);
    return (
      <div className="space-y-4">
        {list.length === 0 && live === undefined ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : (
          list.map((option) => (
            <OptionCard
              key={option._id}
              option={option}
              analysisId={analysisId}
              targetTweetId={targetTweetId}
              targetTweetUrl={targetTweetUrl}
              isDemo={isDemo}
            />
          ))
        )}
        <Button
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => generateMore(kind)}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Generate 3 more {kind === "quote" ? "quote tweets" : "replies"}
        </Button>
      </div>
    );
  };

  return (
    <Tabs defaultValue="replies" className="w-full">
      <div className="mb-2 space-y-3">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="replies" className="min-w-0 px-2 text-xs sm:text-sm">
            Replies ({options.filter((o) => o.kind === "reply").length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="min-w-0 px-2 text-xs sm:text-sm">
            Quote tweets ({options.filter((o) => o.kind === "quote").length})
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid gap-1.5 sm:flex sm:items-center sm:gap-2">
            Model
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 w-full sm:h-8 sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                    {m.id === defaultModel ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {voiceProfiles.length > 0 && (
            <div className="grid gap-1.5 sm:flex sm:items-center sm:gap-2">
              Voice
              <Select value={voiceProfileId} onValueChange={setVoiceProfileId}>
                <SelectTrigger className="h-9 w-full sm:h-8 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceProfiles.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                      {p.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <TabsContent value="replies">{renderList("reply")}</TabsContent>
      <TabsContent value="quotes">{renderList("quote")}</TabsContent>
    </Tabs>
  );
}
