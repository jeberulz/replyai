import { redirect } from "next/navigation";
import { FeedScanner } from "@/components/app/feed-scanner";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";
import { hasProAccess } from "../../../../shared/billing";

export default async function FeedPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  if (!hasProAccess(session.user)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Discovery"
          title="Feed scanner"
          description="The feed scanner and hot-window notifications are Pro features. Free accounts can still analyze pasted tweets and generate replies."
        />
        <Card>
          <CardHeader className="space-y-3">
            <Badge variant="accent" className="w-fit">
              Pro feature
            </Badge>
            <CardTitle className="text-base">
              Unlock live conversation discovery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Pro turns on the feed scanner across all sources and unlocks the
              upcoming notification layer. Nothing auto-posts: every reply still
              requires your explicit click.
            </p>
            <Button asChild>
              <a href="/settings">Open billing settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <FeedScanner />;
}
