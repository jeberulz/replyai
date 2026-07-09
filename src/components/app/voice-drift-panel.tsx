"use client";

import { useState, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Text } from "@/components/ds/text";
import type { ApplyableDriftField } from "../../../shared/voiceDrift";

const FIELD_OPTIONS: Array<{ id: ApplyableDriftField; label: string }> = [
  { id: "tone", label: "Tone" },
  { id: "sentenceLength", label: "Sentence length" },
  { id: "formatting", label: "Formatting" },
  { id: "emojiUse", label: "Emoji use" },
  { id: "punctuation", label: "Punctuation" },
  { id: "readingLevel", label: "Reading level" },
  { id: "commonPhrases", label: "Common phrases" },
  { id: "examples", label: "Replace examples with measured set" },
];

export function VoiceDriftPanel({
  profileId,
}: {
  profileId: string;
}) {
  const sessionToken = useSessionToken();
  const run = useQuery(
    api.voiceDrift.latestForProfile,
    sessionToken
      ? {
          sessionToken,
          profileId: profileId as Id<"voiceProfiles">,
        }
      : "skip"
  );
  const startCheck = useMutation(api.voiceDrift.startCheck);
  const applySuggestion = useMutation(api.voiceDrift.applySuggestion);
  const dismiss = useMutation(api.voiceDrift.dismiss);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<ApplyableDriftField>>(new Set());

  const suggestion = run?.status === "complete" ? run.suggestion : null;
  const changedFields =
    suggestion?.fields.filter((f) => f.changed).map((f) => f.field) ?? [];

  const toggle = (id: ApplyableDriftField) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCheck = () => {
    startTransition(async () => {
      try {
        setSelected(new Set());
        await startCheck({
          sessionToken: sessionToken!,
          profileId: profileId as Id<"voiceProfiles">,
        });
        toast.success("Checking for voice drift…");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Drift check failed"
        );
      }
    });
  };

  const onApply = () => {
    if (!run || selected.size === 0) return;
    startTransition(async () => {
      try {
        await applySuggestion({
          sessionToken: sessionToken!,
          runId: run._id,
          selectedFields: [...selected],
        });
        toast.success("Applied selected style updates");
        setSelected(new Set());
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not apply updates"
        );
      }
    });
  };

  const onDismiss = () => {
    if (!run) return;
    startTransition(async () => {
      try {
        await dismiss({
          sessionToken: sessionToken!,
          runId: run._id,
        });
        setSelected(new Set());
        toast.success("Drift suggestion dismissed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not dismiss"
        );
      }
    });
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          label="Check for voice drift"
          icon={
            pending || run?.status === "running" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )
          }
          isDisabled={pending || !sessionToken || run?.status === "running"}
          onClick={onCheck}
        />
        {run?.demo && run.status === "complete" && (
          <Badge variant="neutral" label="demo" />
        )}
        {run?.status === "complete" && suggestion && (
          <Badge
            variant={
              suggestion.severity === "major"
                ? "error"
                : suggestion.severity === "minor"
                  ? "warning"
                  : "success"
            }
            label={`${suggestion.severity} drift`}
          />
        )}
      </div>

      {run?.status === "running" && (
        <Text type="supporting" color="secondary" display="block">
          Measuring recent writing against this profile…
        </Text>
      )}

      {run?.status === "failed" && (
        <Text type="supporting" color="secondary" display="block">
          {run.error ?? "Drift check failed. Try again."}
        </Text>
      )}

      {run?.status === "complete" && suggestion && (
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
          <Text type="supporting" display="block">
            {suggestion.summary}
          </Text>

          {suggestion.severity === "none" ? (
            <Text type="supporting" color="secondary" display="block">
              Nothing to apply — profile still matches recent writing.
            </Text>
          ) : (
            <>
              <ul className="space-y-2 text-xs">
                {suggestion.fields
                  .filter((f) => f.changed)
                  .map((field) => (
                    <li key={field.field} className="grid gap-0.5">
                      <span className="font-medium text-foreground">
                        {field.label}
                      </span>
                      <span className="text-muted-foreground line-through">
                        {field.before}
                      </span>
                      <span className="text-foreground">{field.after}</span>
                    </li>
                  ))}
              </ul>

              {(suggestion.phraseDelta.added.length > 0 ||
                suggestion.phraseDelta.removed.length > 0) && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {suggestion.phraseDelta.added.length > 0 && (
                    <p>New phrases: {suggestion.phraseDelta.added.join(", ")}</p>
                  )}
                  {suggestion.phraseDelta.removed.length > 0 && (
                    <p>
                      Fading phrases:{" "}
                      {suggestion.phraseDelta.removed.join(", ")}
                    </p>
                  )}
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-foreground">
                  Apply specific fields (never auto-applied)
                </legend>
                {FIELD_OPTIONS.filter(
                  (opt) =>
                    opt.id === "examples" ||
                    changedFields.includes(opt.id) ||
                    (opt.id === "commonPhrases" &&
                      changedFields.includes("commonPhrases"))
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary,#ff4400)]"
                      checked={selected.has(opt.id)}
                      onChange={() => toggle(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  label="Apply selected"
                  isDisabled={pending || selected.size === 0}
                  onClick={onApply}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  label="Dismiss"
                  isDisabled={pending}
                  onClick={onDismiss}
                />
              </div>
            </>
          )}

          {run.appliedFields && run.appliedFields.length > 0 && (
            <Text type="supporting" color="secondary" display="block">
              Applied: {run.appliedFields.join(", ")}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
