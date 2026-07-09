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
import { VoiceDriftPanel } from "@/components/app/voice-drift-panel";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { IconButton } from "@/components/ds/icon-button";
import { Skeleton } from "@/components/ds/skeleton";
import { Text } from "@/components/ds/text";
import { TextArea } from "@/components/ds/text-area";
import { TextInput } from "@/components/ds/text-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildVoiceNegativeConstraints,
  normalizeNegativeConstraints,
  type VoiceNegativeConstraints,
  type VoiceStyle,
} from "../../../shared/voice";

type Profile = {
  _id: string;
  name: string;
  style: VoiceStyle;
  examples: string[];
  bannedPhrases?: string[];
  antiPatterns?: string[];
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
  onSave: (data: {
    name: string;
    style: VoiceStyle;
    examples: string[];
    negativeConstraints: VoiceNegativeConstraints;
  }) => void;
  pending: boolean;
}) {
  const derivedConstraints = initial
    ? buildVoiceNegativeConstraints(initial.examples, initial.style)
    : { bannedPhrases: [], antiPatterns: [] };
  const initialConstraints = normalizeNegativeConstraints({
    bannedPhrases:
      initial?.bannedPhrases && initial.bannedPhrases.length > 0
        ? initial.bannedPhrases
        : derivedConstraints.bannedPhrases,
    antiPatterns:
      initial?.antiPatterns && initial.antiPatterns.length > 0
        ? initial.antiPatterns
        : derivedConstraints.antiPatterns,
  });
  const [name, setName] = useState(initial?.name ?? "");
  const [style, setStyle] = useState<VoiceStyle>(initial?.style ?? EMPTY_STYLE);
  const [phrases, setPhrases] = useState(
    (initial?.style.commonPhrases ?? []).join(", ")
  );
  const [examples, setExamples] = useState((initial?.examples ?? []).join("\n"));
  const [bannedPhrases, setBannedPhrases] = useState(
    initialConstraints.bannedPhrases.join("\n")
  );
  const [antiPatterns, setAntiPatterns] = useState(
    initialConstraints.antiPatterns.join("\n")
  );

  const field = (
    label: string,
    key: keyof Omit<VoiceStyle, "commonPhrases">,
    placeholder: string
  ) => (
    <TextInput
      label={label}
      value={style[key]}
      placeholder={placeholder}
      onChange={(value) => setStyle({ ...style, [key]: value })}
    />
  );

  return (
    <div className="space-y-4">
      <TextInput
        label="Profile name"
        value={name}
        placeholder="e.g. Builder voice, Spicy takes"
        onChange={setName}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Tone", "tone", "contrarian, data-driven")}
        {field("Sentence length", "sentenceLength", "short and punchy")}
        {field("Formatting", "formatting", "line breaks between thoughts")}
        {field("Emoji use", "emojiUse", "none / occasional / frequent")}
        {field("Punctuation", "punctuation", "em dashes, no exclamations")}
        {field("Reading level", "readingLevel", "accessible / technical")}
      </div>
      <TextInput
        label="Common phrases (comma separated)"
        value={phrases}
        placeholder="ship it, the real question is"
        onChange={setPhrases}
      />
      <TextArea
        label="Example tweets (one per line)"
        value={examples}
        placeholder="Paste a few tweets that sound like you"
        rows={4}
        onChange={setExamples}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea
          label="Banned phrases (one per line)"
          value={bannedPhrases}
          placeholder={"Great point!\n🚀"}
          rows={5}
          onChange={setBannedPhrases}
        />
        <TextArea
          label="Anti-patterns (one per line)"
          value={antiPatterns}
          placeholder={"Do not use hashtags.\nDo not add emoji."}
          rows={5}
          onChange={setAntiPatterns}
        />
      </div>
      <DialogFooter>
        <Button
          label={initial ? "Save changes" : "Create profile"}
          icon={pending ? <Loader2 className="animate-spin" /> : undefined}
          isDisabled={pending || !name.trim()}
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
              negativeConstraints: normalizeNegativeConstraints({
                bannedPhrases: bannedPhrases.split("\n"),
                antiPatterns: antiPatterns.split("\n"),
              }),
            })
          }
        />
      </DialogFooter>
    </div>
  );
}

export function VoiceStudio({ xConnected }: { xConnected: boolean }) {
  const sessionToken = useSessionToken();
  const profiles = useQuery(
    api.voiceProfiles.list,
    sessionToken ? { sessionToken } : "skip"
  ) as Profile[] | undefined;
  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "edit"; profile: Profile }
    | { mode: "train" }
    | null
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
        <Button
          variant="secondary"
          label="New profile"
          icon={<Plus className="size-4" />}
          onClick={() => setDialog({ mode: "create" })}
        />
        <Button
          label="Train from my tweets"
          icon={<Sparkles className="size-4" />}
          onClick={() => setDialog({ mode: "train" })}
        />
      </PageHeader>

      {profiles === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton height={192} radius={3} index={0} />
          <Skeleton height={192} radius={3} index={1} />
        </div>
      ) : profiles.length === 0 ? (
        <Card padding={4}>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Mic2 className="size-6 text-muted-foreground" />
            <Text type="supporting" color="secondary" display="block">
              No voice profiles yet. Train one from your tweets or create one
              manually.
            </Text>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile._id} padding={3}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Heading level={3} className="text-base">
                      {profile.name}
                    </Heading>
                    {profile.isDefault && (
                      <Badge
                        variant="success"
                        label="default"
                        icon={<Star className="size-3" />}
                      />
                    )}
                  </div>
                  <Badge variant="neutral" label={profile.source} />
                </div>
                <Text type="supporting" color="secondary" display="block">
                  {profile.style.tone} · {profile.style.sentenceLength}
                </Text>
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
                      <Badge key={phrase} variant="neutral" label={phrase} />
                    ))}
                  </div>
                )}
                {(profile.bannedPhrases?.length || profile.antiPatterns?.length) && (
                  <div className="space-y-1 border-t border-border pt-3 text-xs">
                    {profile.bannedPhrases && profile.bannedPhrases.length > 0 && (
                      <p className="line-clamp-2 text-muted-foreground">
                        Bans: {profile.bannedPhrases.slice(0, 4).join(", ")}
                      </p>
                    )}
                    {profile.antiPatterns && profile.antiPatterns.length > 0 && (
                      <p className="line-clamp-2 text-muted-foreground">
                        Avoids: {profile.antiPatterns.slice(0, 2).join(" ")}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    label="Edit"
                    onClick={() => setDialog({ mode: "edit", profile })}
                  />
                  {!profile.isDefault && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        label="Make default"
                        isDisabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setDefaultVoiceAction(profile._id);
                            toast.success(`"${profile.name}" is now default`);
                          })
                        }
                      />
                      <IconButton
                        label="Delete profile"
                        icon={<Trash2 className="size-4" />}
                        variant="ghost"
                        size="sm"
                        isDisabled={pending}
                        className="ml-auto text-destructive hover:text-destructive"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteVoiceProfileAction(profile._id);
                            toast.success("Profile deleted");
                          })
                        }
                      />
                    </>
                  )}
                </div>
                <VoiceDriftPanel profileId={profile._id} />
              </div>
            </Card>
          ))}
        </div>
      )}

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
          <TextInput
            label="Profile name"
            value={trainName}
            onChange={setTrainName}
          />
          <DialogFooter>
            <Button
              label="Train voice"
              icon={
                pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )
              }
              isDisabled={pending || !trainName.trim()}
              onClick={train}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
