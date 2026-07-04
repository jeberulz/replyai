"use client";

import { createContext, useContext, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const SessionTokenContext = createContext<string>("");

/** Session token for client-side Convex queries. */
export function useSessionToken(): string {
  return useContext(SessionTokenContext);
}

export function ConvexClientProvider({
  sessionToken,
  children,
}: {
  sessionToken: string;
  children: React.ReactNode;
}) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl]
  );

  const inner = (
    <SessionTokenContext.Provider value={sessionToken}>
      {children}
    </SessionTokenContext.Provider>
  );
  if (!client) return inner;
  return <ConvexProvider client={client}>{inner}</ConvexProvider>;
}
