import {
  LayoutDashboard,
  Mic2,
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

export const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/analyze",
    label: "Analyze",
    icon: Search,
    matchPrefixes: ["/analysis"],
  },
  { href: "/feed", label: "Feed scanner", icon: Radar },
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
