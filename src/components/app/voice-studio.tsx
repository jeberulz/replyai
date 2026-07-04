"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, Mic2, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  createVoiceProfileAction,
  deleteVoiceProfileAction,
  setDefaultVoiceAction,
  trainVoiceAction,
  updateVoiceProfileAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { VoiceStyle } from "../../../shared/voice";

type Profile = {
  _id: string;
  name: string;
  style: VoiceStyle;
  examples: string[];
  source: "manual" | "trained";
  isDefault: boolean;
};

const EMPTY_STYLE: VoiceStyle = {
  tone: "conversational and direct",
  sentenceLength: "short and punchy",
  formatting: "plain sentences",
  emojiUse: "none",
  punctuation: "standard",
  readingLevel: "accessible",
  commonPhrases: [],
};

function ProfileForm({
  initial,
  onSave,
  pending,
}: {
  initial: Profile | null;
  onSave: (data: { name: string; style: VoiceStyle; examples: string[] }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [style, setStyle] = useState<VoiceStyle>(initial?.style ?? EMPTY_STYLE);
  const [phrases, setPhrases] = useState(
    (initial?.style.commonPhrases ?? []).join(", ")
  );
  const [examples, setExamples] = useState((initial?.examples ?? []).join("\n"));

  const field = (
    label: string,
    key: keyof Omit<VoiceStyle, "commonPhrases">,
    placeholder: string
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={style[key]}
        placeholder={placeholder}
        onChange={(e) => setStyle({ ...style, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Profile name</Label>
        <Input
          value={name}
          placeholder="e.g. Builder voice, Spicy takes"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Tone", "tone", "contrarian, data-driven")}
        {field("Sentence length", "sentenceLength", "short and punchy")}
        {field("Formatting", "formatting", "line breaks between thoughts")}
        {field("Emoji use", "emojiUse", "none / occasional / frequent")}
        {field("Punctuation", "punctuation", "em dashes, no exclamations")}
        {field("Reading level", "readingLevel", "accessible / technical")}
      </div>
      <div className="space-y-1.5">
        <Label>Common phrases (comma separated)</Label>
        <Input
          value={phrases}
          placeholder="ship it, the real question is"
          onChange={(e) => setPhrases(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Example tweets (one per line)</Label>
        <Textarea
          rows={4}
          value={examples}
          placeholder="Paste a few tweets that sound like you"
          onChange={(e) => setExamples(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button
          disabled={pending || !name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              style: {
                ...style,
                commonPhrases: phrases
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              },
              examples: examples
                .split("\n")
                .map((e) => e.trim())
                .filter(Boolean),
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />}
          {initial ? "Save changes" : "Create profile"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function VoiceStudio({ xConnected }: { xConnected: boolean }) {
  const sessionToken = useSessionToken();
  const profiles = useQuery(
    api.voiceProfiles.list,
    sessionToken ? { sessionToken } : "skip"
  ) as
    | Profile[]
    | undefined;
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; profile: Profile } | { mode: "train" } | null
  >(null);
  const [trainName, setTrainName] = useState("My voice");
  const [pending, startTransition] = useTransition();

  const train = () => {
    startTransition(async () => {
      try {
        await trainVoiceAction(trainName);
        setDialog(null);
        toast.success("Voice trained from your recent tweets");
      } catch {
        toast.error("Training failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Sound like you"
        title="Voice profiles"
        description="Every generated reply runs through a voice profile so it sounds like you, not like an AI."
      >
        <Button variant="outline" onClick={() => setDialog({ mode: "create" })}>
          <Plus /> New profile
        </Button>
        <Button onClick={() => setDialog({ mode: "train" })}>
          <Sparkles /> Train from my tweets
        </Button>
      </PageHeader>

      {profiles === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Mic2 className="size-6" />
            No voice profiles yet. Train one from your tweets or create one
            manually.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {profile.name}
                    {profile.isDefault && (
                      <Badge variant="success">
                        <Star className="size-3" /> default
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge variant="outline">{profile.source}</Badge>
                </div>
                <CardDescription>
                  {profile.style.tone} · {profile.style.sentenceLength}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {(
                    [
                      ["Formatting", profile.style.formatting],
                      ["Emoji", profile.style.emojiUse],
                      ["Punctuation", profile.style.punctuation],
                      ["Reading level", profile.style.readingLevel],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="truncate" title={value}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {profile.style.commonPhrases.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.style.commonPhrases.map((phrase) => (
                      <Badge key={phrase} variant="secondary">
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ mode: "edit", profile })}
                  >
                    Edit
                  </Button>
                  {!profile.isDefault && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setDefaultVoiceAction(profile._id);
                            toast.success(`"${profile.name}" is now default`);
                          })
                        }
                      >
                        Make default
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:text-destructive"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteVoiceProfileAction(profile._id);
                            toast.success("Profile deleted");
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={dialog?.mode === "create" || dialog?.mode === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Edit profile" : "New voice profile"}
            </DialogTitle>
            <DialogDescription>
              Describe how this voice writes. Generated replies will follow it.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm
            key={dialog?.mode === "edit" ? dialog.profile._id : "create"}
            initial={dialog?.mode === "edit" ? dialog.profile : null}
            pending={pending}
            onSave={(data) =>
              startTransition(async () => {
                if (dialog?.mode === "edit") {
                  await updateVoiceProfileAction({
                    profileId: dialog.profile._id,
                    ...data,
                  });
                  toast.success("Profile updated");
                } else {
                  await createVoiceProfileAction(data);
                  toast.success("Profile created");
                }
                setDialog(null);
              })
            }
          />
        </DialogContent>
      </Dialog>

      {/* Train dialog */}
      <Dialog
        open={dialog?.mode === "train"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Train a voice from your tweets</DialogTitle>
            <DialogDescription>
              {xConnected
                ? "We'll import your recent tweets and measure vocabulary, sentence length, formatting, punctuation, and common phrases."
                : "X isn't connected, so this trains on realistic sample tweets — connect X in Settings to train on your own."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Profile name</Label>
            <Input
              value={trainName}
              onChange={(e) => setTrainName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={pending || !trainName.trim()} onClick={train}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Train voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
