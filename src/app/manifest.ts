import type { MetadataRoute } from "next";

/**
 * Web app manifest — Dark Chrome tokens (design.md).
 * start_url is the authenticated app home; display standalone for installability.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReplyPilot AI",
    short_name: "ReplyPilot",
    description:
      "Find conversations worth joining on X, and reply in your own voice before the window closes.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["productivity", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
