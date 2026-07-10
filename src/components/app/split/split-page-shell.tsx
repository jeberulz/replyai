import type { ReactNode } from "react";

import { PageHeader } from "@/components/app/page-header";

/**
 * Voice-style page header above a full-height MasterDetail split.
 * Keeps page identity out of the left pane toolbar.
 */
export function SplitPageShell({
  eyebrow,
  title,
  description,
  headerActions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-6 md:h-[calc(100dvh-4rem)]">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      >
        {headerActions}
      </PageHeader>
      <div className="-mx-4 min-h-0 flex-1 overflow-hidden md:-mx-10">
        {children}
      </div>
    </div>
  );
}
