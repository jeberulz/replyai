import { ConvexHttpClient } from "convex/browser";
import { requireConvexUrl } from "./env";

let client: ConvexHttpClient | null = null;
let clientUrl: string | null = null;

/** Server-side Convex client. Recreated when the deployment URL changes. */
export function convexServer(): ConvexHttpClient {
  const url = requireConvexUrl();
  if (!client || clientUrl !== url) {
    client = new ConvexHttpClient(url);
    clientUrl = url;
  }
  return client;
}
