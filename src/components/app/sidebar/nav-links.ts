import {
  FileText,
  FlaskConical,
  Mic2,
  Newspaper,
  PenLine,
  Plus,
  Radar,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should mark this link active */
  matchPrefixes?: string[];
};

// The chat-first home owns /dashboard; /analysis/* routes light up their
// row in the Library list instead of a nav link.
export const navLinks: NavLink[] = [
  { href: "/dashboard", label: "New analysis", icon: Plus },
  { href: "/compose", label: "Compose", icon: PenLine },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/feed", label: "Feed scanner", icon: Radar },
  { href: "/briefing", label: "Briefing", icon: Newspaper },
  { href: "/research", label: "Research", icon: Search },
  { href: "/evals", label: "Evals", icon: FlaskConical },
  { href: "/voice", label: "Voice", icon: Mic2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(
  pathname: string,
  link: NavLink
): boolean {
  if (pathname === link.href || pathname.startsWith(link.href + "/")) {
    return true;
  }
  return (
    link.matchPrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    ) ?? false
  );
}
