"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

export function useEngagementWindow() {
  const sessionToken = useSessionToken();
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  return useQuery(
    api.timing.engagementWindow,
    sessionToken ? { sessionToken, timezoneOffsetMinutes } : "skip"
  );
}
