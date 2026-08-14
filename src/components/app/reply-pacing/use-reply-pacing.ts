"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { replyPacingSnapshotTime } from "../../../../shared/replyPacing";

export function useReplyPacing() {
  const sessionToken = useSessionToken();
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const [nowMs] = useState(() => replyPacingSnapshotTime(Date.now()));

  return useQuery(
    api.usage.pacingCoach,
    sessionToken ? { sessionToken, timezoneOffsetMinutes, nowMs } : "skip",
  );
}
