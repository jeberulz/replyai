"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setDefaultModelAction } from "@/app/actions";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";
import { DEFAULT_MODEL_ID, MODELS } from "../../../shared/models";

export function DefaultModelCard({ defaultModel }: { defaultModel?: string }) {
  const [pending, startTransition] = useTransition();
  const active = defaultModel ?? DEFAULT_MODEL_ID;

  const choose = (model: string) => {
    startTransition(async () => {
      try {
        await setDefaultModelAction(model);
        toast.success("Default model updated");
      } catch {
        toast.error("Could not save default model");
      }
    });
  };

  return (
    <Card padding={3}>
      <div className="space-y-4">
        <div className="space-y-1">
          <Heading level={3} className="text-base">
            Generation model
          </Heading>
          <Text type="supporting" color="secondary" display="block">
            Which Claude model drafts your replies by default. Run a model
            comparison on any analysis to see quality vs. cost before
            downgrading. Prices are per million tokens.
          </Text>
        </div>
        <div className="space-y-3">
          {MODELS.map((m) => {
            const isActive = m.id === active;
            return (
              <div
                key={m.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 ${
                  isActive ? "border-primary/60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {m.label}
                    <span className="font-normal text-xs text-muted-foreground">
                      {m.tier} · ${m.inputPerMTok} in / ${m.outputPerMTok} out
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {m.description}
                  </div>
                </div>
                {isActive ? (
                  <Badge
                    variant="success"
                    label="Default"
                    icon={<Check className="size-3" />}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Use this model"
                    icon={
                      pending ? <Loader2 className="animate-spin" /> : undefined
                    }
                    isDisabled={pending}
                    onClick={() => choose(m.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
