"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

export function useEngagementWindow() {
  const sessionToken = useSessionToken();
  return useQuery(
    api.timing.engagementWindow,
    sessionToken ? { sessionToken } : "skip"
  );
}
