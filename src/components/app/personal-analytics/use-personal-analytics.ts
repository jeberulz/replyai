"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

export function usePersonalAnalytics() {
  const sessionToken = useSessionToken();
  const timezoneOffsetMinutes = useMemo(
    () => new Date().getTimezoneOffset(),
    []
  );

  return useQuery(
    api.usage.personalAnalytics,
    sessionToken ? { sessionToken, timezoneOffsetMinutes } : "skip"
  );
}
