import { redirect } from "next/navigation";

// The analyze form now lives on the chat-first dashboard; keep old links
// and bookmarks working.
export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  redirect(url ? `/dashboard?url=${encodeURIComponent(url)}` : "/dashboard");
}
