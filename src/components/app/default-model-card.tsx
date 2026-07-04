"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setDefaultModelAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generation model</CardTitle>
        <CardDescription>
          Which Claude model drafts your replies by default. Run a model
          comparison on any analysis to see quality vs. cost before
          downgrading. Prices are per million tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {MODELS.map((m) => {
          const isActive = m.id === active;
          return (
            <div
              key={m.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
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
                <Badge variant="success">
                  <Check className="size-3" /> Default
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => choose(m.id)}
                >
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  Use this model
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
