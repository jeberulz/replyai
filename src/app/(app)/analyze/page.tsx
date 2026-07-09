import { redirect } from "next/navigation";

// The analyze form now lives on the chat-first dashboard; keep old links
// and bookmarks working. Preserve auto=1 for the browser-extension deep link.
export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; auto?: string }>;
}) {
  const { url, auto } = await searchParams;
  if (!url) redirect("/dashboard");
  const params = new URLSearchParams({ url });
  if (auto === "1" || auto === "true") params.set("auto", "1");
  redirect(`/dashboard?${params.toString()}`);
}
