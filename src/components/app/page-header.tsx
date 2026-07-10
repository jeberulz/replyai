/**
 * Editorial page header for in-app screens — the same idiom the landing page
 * uses (orange mono eyebrow → Instrument Serif title → Inter subtitle), so the
 * app and marketing surfaces read as one product. See design.md "Typography".
 *
 * Heading uses Astryx/Dark Chrome `--font-family-heading` (Instrument Serif,
 * weight 400). Never add font-bold/semibold to Instrument Serif.
 */

import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import { rpType } from "@/theme/typography";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="space-y-2">
        <Text
          type="code"
          color="accent"
          display="block"
          className={cn(rpType.xsUpper, "text-primary")}
        >
          {eyebrow}
        </Text>
        <Heading level={1} className={cn(rpType.pageTitle, "text-foreground")}>
          {title}
        </Heading>
        {description ? (
          <Text
            type="supporting"
            color="secondary"
            display="block"
            className={cn(rpType.body, "max-w-[60ch] text-muted-foreground")}
          >
            {description}
          </Text>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
