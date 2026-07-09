"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";

import { Banner } from "@/components/ds/banner";
import { useFairUse } from "./use-fair-use";
import { cn } from "@/lib/utils";

export function FairUseBanner({ className }: { className?: string }) {
  const status = useFairUse("start_analysis");
  if (!status || status.isDemo || status.unlimited) return null;

  if (status.blocked) {
    return (
      <div className={cn("space-y-2", className)}>
        <Banner
          status="error"
          title="Analysis limit reached"
          description={status.message ?? undefined}
          icon={<Gauge className="size-4" />}
        />
        {status.plan === "free" && (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
              Upgrade to Pro
            </Link>
          </p>
        )}
      </div>
    );
  }

  if (status.plan === "free" && status.remaining.analysesToday !== null) {
    const remaining = status.remaining.analysesToday;
    if (remaining > 1) return null;
    return (
      <div className={cn("space-y-2", className)}>
        <Banner
          status={remaining === 0 ? "warning" : "info"}
          title={
            remaining === 0
              ? "Last free analysis for today"
              : "1 free analysis left today"
          }
          description={`Free plan includes ${status.limits.dailyAnalyses} analyses per day. Pro unlocks unlimited analyses under fair use.`}
          icon={<Gauge className="size-4" />}
        />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
            View plans
          </Link>
        </p>
      </div>
    );
  }

  return null;
}
