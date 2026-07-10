"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

export function useReplyPacing() {
  const sessionToken = useSessionToken();
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();

  return useQuery(
    api.usage.pacingCoach,
    sessionToken ? { sessionToken, timezoneOffsetMinutes } : "skip"
  );
}
