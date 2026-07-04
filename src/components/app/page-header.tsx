/**
 * Editorial page header for in-app screens — the same idiom the landing page
 * uses (orange mono eyebrow → Instrument Serif title → Inter subtitle), so the
 * app and marketing surfaces read as one product. See design.md "Typography".
 *
 * Serif titles render at the app h1 step (2rem, tracking -0.02em) in the single
 * shipping weight (400) — never add font-bold/semibold to Instrument Serif.
 */
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
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="font-serif text-[2rem] leading-[1.05] tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="max-w-[60ch] text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
