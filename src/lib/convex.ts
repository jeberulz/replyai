import { ConvexHttpClient } from "convex/browser";
import { requireConvexUrl } from "./env";

let client: ConvexHttpClient | null = null;

/** Server-side Convex client. Lazily created so builds work without env. */
export function convexServer(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(requireConvexUrl());
  }
  return client;
}
