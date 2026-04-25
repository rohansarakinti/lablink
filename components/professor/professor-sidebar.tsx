"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, UserRound } from "lucide-react";

const nav = [
  { href: "/dashboard/professor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/professor/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/professor/profile", label: "My profile", icon: UserRound, exact: false },
] as const;

export function ProfessorSidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-zinc-200/80 bg-white md:w-52 lg:w-56">
      <div className="border-b border-zinc-100 px-4 py-5 md:px-5">
        <p className="text-lg font-semibold leading-tight tracking-tight text-ll-navy">{displayName}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Professor workspace</p>
      </div>
      <nav className="flex flex-col gap-1 p-3" aria-label="Professor navigation">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-ll-bg text-ll-navy shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-ll-navy"
              }`}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
