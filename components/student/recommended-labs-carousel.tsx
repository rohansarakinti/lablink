"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 3;

export type RecommendedLabItem = {
  id: string;
  name: string;
  university: string | null;
  topic: string;
  matchPct: number | null;
};

export function RecommendedLabsCarousel({ items }: { items: RecommendedLabItem[] }) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const visible = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, pageIndex]);

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  return (
    <div className="ll-animate-fade-in flex items-stretch gap-2 sm:gap-3">
      <button
        type="button"
        aria-label="Previous labs"
        disabled={!canPrev}
        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
        className="flex h-auto shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-2 py-4 text-ll-navy shadow-sm transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-zinc-300 enabled:hover:bg-zinc-50 enabled:hover:shadow disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
      >
        <ChevronLeft className="size-5 sm:size-6" aria-hidden />
      </button>

      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 sm:gap-4">
        {visible.map((lab) => (
          <Link
            key={lab.id}
            href={`/dashboard/student/lab/${lab.id}`}
            className="group flex min-h-[140px] min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[160px] sm:p-4"
          >
            {lab.matchPct != null ? (
              <p className="text-xs font-bold text-ll-purple transition-opacity duration-200 group-hover:opacity-90 sm:text-sm">{lab.matchPct}% match</p>
            ) : (
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">Suggested lab</p>
            )}
            <h3 className="mt-1.5 line-clamp-3 text-xs font-bold leading-snug text-ll-navy sm:mt-2 sm:line-clamp-2 sm:text-lg">
              {lab.name}
            </h3>
            <p className="mt-1 text-xs leading-snug text-zinc-600 sm:text-base">
              <span className="line-clamp-2">{lab.university}</span>
            </p>
            <p className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 sm:pt-3 sm:text-xs">
              Focus: {String(lab.topic).toUpperCase()}
            </p>
          </Link>
        ))}
      </div>

      <button
        type="button"
        aria-label="Next labs"
        disabled={!canNext}
        onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
        className="flex h-auto shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-2 py-4 text-ll-navy shadow-sm transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-zinc-300 enabled:hover:bg-zinc-50 enabled:hover:shadow disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
      >
        <ChevronRight className="size-5 sm:size-6" aria-hidden />
      </button>
    </div>
  );
}
