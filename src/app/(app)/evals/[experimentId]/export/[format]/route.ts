import { notFound, redirect } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ experimentId: string; format: string }>;
  }
) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { experimentId, format } = await params;
  if (format !== "json" && format !== "csv") notFound();

  try {
    const exported = await convexServer().query(api.evalResults.exportRedacted, {
      sessionToken: session.sessionToken,
      experimentId: experimentId as Id<"evalExperiments">,
      format,
    });
    return new Response(exported.content, {
      headers: {
        "content-type": `${exported.mimeType}; charset=utf-8`,
        "content-disposition": `attachment; filename="${exported.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    notFound();
  }
}
