"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "", label: "Overview" },
  { href: "public-profile", label: "Public profile" },
  { href: "members", label: "Members" },
  { href: "feed", label: "Feed" },
  { href: "postings", label: "Role postings" },
] as const;

export function LabManagementNav({ labId }: { labId: string }) {
  const pathname = usePathname();
  const base = `/labs/${labId}`;

  const isActive = (href: string) => {
    if (href === "") {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname.startsWith(`${base}/${href}`);
  };

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Lab sections">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.label}
            href={`${base}${tab.href ? `/${tab.href}` : ""}`}
            className={
              active
                ? "rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white shadow-md shadow-ll-navy/25 ring-2 ring-ll-purple/30 transition hover:bg-[#004c58]"
                : "rounded-full border border-zinc-200/90 bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition hover:border-ll-purple/25 hover:bg-ll-bg/60 hover:text-ll-navy"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
