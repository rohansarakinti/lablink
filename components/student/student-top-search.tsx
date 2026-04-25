"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Search } from "lucide-react";

export function StudentTopSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");

  const syncFromUrl = useCallback(() => {
    if (pathname === "/dashboard/student/search") {
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("q", q);
    router.push(`/dashboard/student/search?${next.toString()}`);
  };

  return (
    <div className="ll-animate-fade-in border-b border-zinc-200/90 bg-[#fafafa]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 md:px-6">
        <form onSubmit={onSubmit} className="relative min-w-0 flex-1">
          <label htmlFor="student-dash-search" className="sr-only">
            Search roles
          </label>
          <input
            id="student-dash-search"
            name="q"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search roles, labs, skills…"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-4 pr-12 text-sm text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-ll-purple focus:outline-none focus:ring-2 focus:ring-ll-purple/25"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 hover:scale-105 hover:bg-zinc-100 hover:text-ll-navy"
            aria-label="Search"
          >
            <Search className="size-5" strokeWidth={2} />
          </button>
        </form>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow"
            aria-label="Notifications"
            title="Notifications (coming soon)"
          >
            <Bell className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
