"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export type SearchFilterOption = {
  value: string;
  label: string;
};

export type SearchFilterSection = {
  key: string;
  label: string;
  options: SearchFilterOption[];
};

function useOutsideClose(
  refs: MutableRefObject<Array<HTMLDivElement | null>>,
  close: () => void,
) {
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      const insideAny = refs.current.some((node) => node?.contains(target));
      if (!insideAny) close();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close, refs]);
}

export function SearchFilterRow({
  query,
  selected,
  sections,
}: {
  query: string;
  selected: Record<string, string[]>;
  sections: SearchFilterSection[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootsRef = useRef<Array<HTMLDivElement | null>>([]);

  useOutsideClose(rootsRef, () => setOpenKey(null));

  const hasActiveFilters = useMemo(
    () => Object.values(selected).some((values) => values.length > 0),
    [selected],
  );

  function nextParamsForToggle(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("q", query);
    const current = new Set(next.getAll(key));
    if (current.has(value)) current.delete(value);
    else current.add(value);
    next.delete(key);
    for (const item of current) {
      next.append(key, item);
    }
    return next.toString();
  }

  function clearAll() {
    router.push(`${pathname}?q=${encodeURIComponent(query)}`);
  }

  return (
    <section className="ll-animate-fade-up ll-delay-100 relative z-40 mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Filters</h2>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-ll-navy underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {sections.map((section, idx) => {
          if (section.options.length === 0) return null;
          const selectedValues = selected[section.key] ?? [];
          const count = selectedValues.length;
          const isOpen = openKey === section.key;

          return (
            <div
              key={section.key}
              ref={(node) => {
                rootsRef.current[idx] = node;
              }}
              className="relative"
            >
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 ${
                  count > 0
                    ? "border-ll-purple/60 bg-ll-purple/10 text-ll-navy"
                    : "border-ll-bg bg-ll-bg text-ll-navy hover:-translate-y-0.5 hover:brightness-95"
                }`}
              >
                <span>{section.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-ll-navy px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {count}
                  </span>
                ) : null}
                <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen ? (
                <div className="ll-animate-fade-in absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
                  <div className="max-h-72 overflow-y-auto pr-1">
                    {section.options.map((option) => {
                      const checked = selectedValues.includes(option.value);
                      return (
                        <label
                          key={`${section.key}-${option.value}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => router.push(`${pathname}?${nextParamsForToggle(section.key, option.value)}`)}
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          <span className="leading-tight">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
