"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Beaker, Code, Dna, Microscope, Save } from "lucide-react";

export type StudentSearchResult = {
  postingId: string;
  vectorScore: number;
  reason: string;
  title: string;
  labName: string;
  university: string;
  department: string | null;
  topic: string;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  isPaid: string | null;
  hoursPerWeek: string | null;
  applicationDeadline: string | null;
  minGpa: number | null;
  preferredYear: string[];
  piName: string;
  labEnvironment: string[];
  researchFields: string[];
  bannerUrl: string | null;
  labLogoUrl: string | null;
  /** Filled when the API exposes aggregate counts; otherwise null */
  applicantCount: number | null;
};

function pctFromScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score * 100)));
}

function pickIcon(label: string) {
  const s = label.toLowerCase();
  if (s.includes("python") || s.includes("code") || s.includes("program")) return Code;
  if (s.includes("stat") || s.includes("data")) return BarChart3;
  if (s.includes("bio") || s.includes("cell") || s.includes("molecular")) return Dna;
  if (s.includes("chem") || s.includes("wet")) return Beaker;
  return Microscope;
}

function splitDescription(text: string | null, maxParas = 3) {
  if (!text?.trim()) return [];
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.slice(0, maxParas);
}

function formatYearLabel(years: string[]) {
  if (!years.length) return "Any level";
  return years.join(" · ");
}

const DEFAULT_LAB_ENV: { title: string; desc: string }[] = [
  { title: "Mentorship-heavy", desc: "Direct weekly 1-on-1s with the PI and senior post-docs when available." },
  { title: "Fast-paced", desc: "High output expected with regular milestone reviews." },
  { title: "Collaborative", desc: "Bi-weekly journal clubs and cross-functional project work when applicable." },
];

function formatDeadlineDisplay(iso: string | null) {
  if (!iso?.trim()) {
    return { line1: "Not", line2: "listed yet" };
  }
  const d = new Date(iso);
  const line1 = d.toLocaleDateString(undefined, { month: "long" });
  const day = d.getDate();
  const y = d.getFullYear();
  const ord = (n: number) => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
  };
  return { line1, line2: `${ord(day)}, ${y}` };
}

export function StudentSearchBrowser({ items, query }: { items: StudentSearchResult[]; query: string }) {
  const [selectedId, setSelectedId] = useState(items[0]?.postingId ?? "");
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [detailBlockHeight, setDetailBlockHeight] = useState(0);
  const [syncListToDetail, setSyncListToDetail] = useState(false);

  const selected = useMemo(
    () => items.find((i) => i.postingId === selectedId) ?? items[0],
    [items, selectedId],
  );

  const measureDetailHeight = useCallback(() => {
    const el = detailRef.current;
    if (el) setDetailBlockHeight(el.getBoundingClientRect().height);
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => {
      setSyncListToDetail(mq.matches);
      requestAnimationFrame(measureDetailHeight);
    };
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, [measureDetailHeight]);

  useLayoutEffect(() => {
    const el = detailRef.current;
    if (!el) return;
    const measure = () => measureDetailHeight();
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedId, query, measureDetailHeight]);

  if (items.length === 0) {
    return null;
  }

  const requiredOnly = (selected?.requiredSkills ?? []).filter(Boolean).slice(0, 8);
  const skillGrid =
    requiredOnly.length > 0
      ? requiredOnly
      : [...(selected?.preferredSkills ?? [])].filter(Boolean).slice(0, 8);
  const paras = splitDescription(selected?.description ?? null);
  const matchPct = pctFromScore(selected?.vectorScore ?? 0);

  const eyebrow = (selected?.department ?? selected?.university ?? "Research opportunity").toUpperCase();

  function parseEnvLine(line: string) {
    const split = line.split(/[|–—:]/).map((s) => s.trim());
    if (split.length >= 2 && split[1]) {
      return { title: split[0], desc: split.slice(1).join(" — ") };
    }
    return { title: line, desc: "From this lab’s profile for this listing." };
  }

  const envRows = (() => {
    const raw = selected?.labEnvironment?.length ? selected.labEnvironment : [];
    if (raw.length === 0) return DEFAULT_LAB_ENV;
    return raw.slice(0, 3).map((line) => {
      const p = parseEnvLine(line);
      return { title: p.title, desc: p.desc };
    });
  })();

  const deadlineLines = formatDeadlineDisplay(selected?.applicationDeadline ?? null);

  const listColStyle =
    syncListToDetail && detailBlockHeight > 0
      ? ({ height: detailBlockHeight } as const)
      : undefined;

  return (
    <div className="h-fit w-full min-h-0 max-w-full">
      <div className="flex min-h-0 w-full max-w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Matched list: on lg, height = measured detail block so the row doesn’t grow with list min-content; scroll inside */}
        <div
          className="flex min-h-0 w-full max-h-[60vh] flex-col overflow-hidden max-lg:shrink-0 lg:min-w-[220px] lg:max-w-[252px] lg:max-h-none"
          style={listColStyle}
        >
        <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-zinc-500">Matched opportunities</h2>
        <div className="min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          {items.map((item) => {
            const pct = pctFromScore(item.vectorScore);
            return (
              <button
                key={item.postingId}
                type="button"
                onClick={() => setSelectedId(item.postingId)}
                className="group w-full border-b border-zinc-200 border-l-4 border-l-transparent p-4 pl-3 text-left transition-colors last:border-b-0 hover:border-l-ll-purple hover:bg-white"
              >
                <span
                  className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 group-hover:bg-ll-purple group-hover:text-white transition-colors"
                >
                  {pct}% match
                </span>
                <p className="mt-2 font-bold text-ll-navy leading-snug">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-700">{item.labName}</p>
                <p className="text-xs text-zinc-500">{item.piName}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Topic: {item.topic}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail: intrinsic height — measured so the list column (lg) can match without flex min-content from long lists */}
      <div
        ref={detailRef}
        className="min-h-0 w-full min-w-0 max-w-full shrink-0 grow overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:flex-1"
      >
        <div
          className={`relative h-[12rem] w-full overflow-hidden rounded-t-2xl rounded-br-[2.25rem] rounded-bl-none bg-gradient-to-br from-ll-navy via-[#0a4a52] to-ll-navy md:h-52 ${
            selected?.bannerUrl ? "" : "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20fill%3D%22%23ffffff08%22%20d%3D%22M0%200h40v40H0z%22%2F%3E%3Cpath%20stroke%3D%22%23ffffff0d%22%20d%3D%22M0%200l40%2040M40%200L0%2040%22%2F%3E%3C%2Fsvg%3E')]"
          }`}
        >
          {selected?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.bannerUrl}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-95"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
          <div className="absolute inset-0 flex flex-col justify-end p-5 pb-6 text-white md:p-7 md:pb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">{eyebrow}</p>
            <h3 className="mt-2 text-2xl font-bold leading-[1.15] tracking-tight md:text-[1.75rem]">{selected?.labName}</h3>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/90 md:text-base">{selected?.title}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                PI: {selected?.piName}
              </span>
              <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                {matchPct}% match score
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3 md:px-8">
          <Link
            href={`/postings/${selected?.postingId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-ll-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ll-navy/90"
          >
            Apply now
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-xl bg-ll-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm opacity-90 hover:opacity-100 disabled:cursor-not-allowed"
            disabled
          >
            <Save className="size-4" />
            Save
          </button>
        </div>

        <div className="grid items-stretch gap-0 lg:grid-cols-12">
          <div className="min-h-0 border-zinc-100 bg-white px-5 py-6 md:px-8 md:py-7 lg:col-span-7 lg:h-full lg:border-r">
            <h4 className="text-2xl font-bold tracking-tight text-zinc-900">About the lab</h4>
            {paras.length > 0 ? (
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-zinc-600 md:text-[15px]">
                {paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-zinc-500">No long description is available for this listing yet.</p>
            )}

            <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why this match</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{selected?.reason}</p>
            </div>

            {skillGrid.length > 0 ? (
              <>
                <h4 className="mt-8 text-2xl font-bold text-zinc-900">Required skills</h4>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {skillGrid.map((skill) => {
                    const Icon = pickIcon(skill);
                    return (
                      <div
                        key={skill}
                        className="flex items-center gap-3 rounded-r-lg border-y border-r border-zinc-200/80 border-l-4 border-l-ll-purple bg-[#f3f4f6] py-2.5 pl-2 pr-3 text-sm font-semibold text-zinc-900 shadow-sm"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center text-ll-navy">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 leading-snug">{skill}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>

          <aside className="flex w-full min-h-0 flex-col border-t border-zinc-200/80 bg-zinc-100/80 px-5 py-5 md:px-6 md:py-6 lg:col-span-5 lg:h-full lg:border-l lg:border-t-0 lg:border-zinc-200/80">
            <div className="min-h-0 space-y-5 lg:space-y-6">
              <div className="rounded-2xl bg-[#1a2e35] p-4 text-white shadow-sm md:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Application deadline</p>
                <p className="mt-1 text-2xl font-bold leading-tight tracking-tight md:text-[1.75rem]">{deadlineLines.line1}</p>
                <p className="text-2xl font-bold leading-tight tracking-tight md:text-[1.75rem]">{deadlineLines.line2}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  {selected != null && selected.applicantCount != null && selected.applicantCount > 0
                    ? `${selected.applicantCount} applicant${selected.applicantCount === 1 ? " has" : "s have"} already applied to this role.`
                    : "Open the full posting to apply—interest and timing can change as other students move through the process."}
                </p>
                {selected?.isPaid != null && selected.isPaid !== "" ? (
                  <p className="mt-4 border-t border-white/20 pt-3 text-sm text-white/90">Compensation: {selected.isPaid}</p>
                ) : null}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Lab environment</h3>
                <ul className="mt-3 space-y-3">
                  {envRows.map((row, i) => (
                    <li key={i}>
                      <p className="text-sm font-bold text-zinc-900">{row.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{row.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Academic requirements</h3>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-xl border border-zinc-300/50 bg-[#c2d0d3] p-3 shadow-sm md:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Minimum GPA</p>
                    <p className="mt-1 text-xl font-bold text-zinc-900 md:text-2xl">
                      {selected?.minGpa != null ? String(selected.minGpa) : "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-300/50 bg-[#c2d0d3] p-3 shadow-sm md:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Student level</p>
                    <p className="mt-1 text-xl font-bold leading-tight text-zinc-900 md:text-2xl">
                      {formatYearLabel(selected?.preferredYear ?? [])}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-300/50 bg-[#c2d0d3] p-3 shadow-sm md:p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Weekly commitment</p>
                    <p className="mt-1 text-xl font-bold text-zinc-900 md:text-2xl">{selected?.hoursPerWeek ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <p className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 text-center text-[11px] text-zinc-400 md:px-8">
          Results for &quot;{query}&quot; · ordered by vector similarity, then re-ranked
        </p>
      </div>
      </div>
    </div>
  );
}
