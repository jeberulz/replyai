"use client";

import * as React from "react";

/**
 * Desktop-first breakpoint hook. Defaults to `true` (the app is desktop-primary)
 * so SSR renders the split; corrects on mount for narrow viewports. Used to
 * render the split view OR the stacked layout — never both at once, so stateful
 * panes (OptionsPanel etc.) mount a single time.
 */
export function useIsDesktop(query = "(min-width: 1024px)") {
  const [isDesktop, setIsDesktop] = React.useState(true);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return isDesktop;
}
