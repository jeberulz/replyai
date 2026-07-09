"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

export function useFairUse(
  action: "start_analysis" | "run_analysis" | "generate" = "start_analysis"
) {
  const sessionToken = useSessionToken();
  return useQuery(
    api.usage.fairUseStatus,
    sessionToken ? { sessionToken, action } : "skip"
  );
}
