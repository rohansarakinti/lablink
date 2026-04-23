"use client";

import { useMemo, useState } from "react";
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

export function StudentSearchBrowser({ items, query }: { items: StudentSearchResult[]; query: string }) {
  const [selectedId, setSelectedId] = useState(items[0]?.postingId ?? "");

  const selected = useMemo(
    () => items.find((i) => i.postingId === selectedId) ?? items[0],
    [items, selectedId],
  );

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

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row lg:gap-5">
      {/* Matched list */}
      <div className="flex w-full shrink-0 flex-col lg:max-w-[320px] lg:min-w-[280px]">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Matched opportunities</h2>
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = item.postingId === (selected?.postingId ?? "");
            const pct = pctFromScore(item.vectorScore);
            return (
              <button
                key={item.postingId}
                type="button"
                onClick={() => setSelectedId(item.postingId)}
                className={`rounded-xl border p-4 text-left transition-shadow ${
                  active
                    ? "border-ll-purple/50 bg-white shadow-md ring-1 ring-ll-purple/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <p className="text-xs font-semibold text-ll-purple">{pct}% match</p>
                <p className="mt-1 font-semibold text-ll-navy">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {item.labName}
                  <br />
                  <span className="text-zinc-500">{item.piName}</span>
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Topic: {item.topic}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail — hero + actions + 2-col body (main / sidebar) */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div
          className={`relative h-[13.5rem] w-full overflow-hidden rounded-t-2xl rounded-br-[2.25rem] rounded-bl-none bg-gradient-to-br from-ll-navy via-[#0a4a52] to-ll-navy md:h-60 ${
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

        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4 md:px-8">
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

        <div className="grid lg:grid-cols-12 lg:gap-0">
          <div className="border-zinc-100 px-5 py-6 md:px-8 md:py-8 lg:col-span-8 lg:border-r">
            <h4 className="text-xl font-bold tracking-tight text-ll-navy">About this role</h4>
            {paras.length > 0 ? (
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-600 md:text-[15px]">
                {paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No long description is available for this listing yet.</p>
            )}

            <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why this match</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{selected?.reason}</p>
            </div>

            {skillGrid.length > 0 ? (
              <>
                <h4 className="mt-10 text-lg font-bold text-ll-navy">Required skills</h4>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {skillGrid.map((skill) => {
                    const Icon = pickIcon(skill);
                    return (
                      <div
                        key={skill}
                        className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-zinc-100/90 px-3.5 py-3 text-sm text-zinc-800"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-ll-navy shadow-sm">
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

          <aside className="space-y-6 bg-zinc-50/80 px-5 py-6 md:px-8 md:py-8 lg:col-span-4">
            <div className="rounded-2xl rounded-br-[2rem] bg-ll-navy p-5 text-white shadow-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Application deadline</p>
              <p className="mt-2 text-2xl font-bold leading-tight tracking-tight">
                {selected?.applicationDeadline
                  ? new Date(selected.applicationDeadline).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not listed"}
              </p>
              <p className="mt-4 text-xs leading-relaxed text-white/65">
                Open the full posting to apply and see the latest timeline from the lab.
              </p>
              {selected?.isPaid != null && selected.isPaid !== "" ? (
                <p className="mt-3 border-t border-white/15 pt-3 text-sm text-white/85">Compensation: {selected.isPaid}</p>
              ) : null}
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Lab environment</h3>
              <ul className="mt-4 space-y-5">
                {(selected?.labEnvironment?.length
                  ? selected.labEnvironment
                  : ["Collaborative", "Mentorship-focused", "Project-driven"]
                ).map((line, i) => {
                  const { title, desc } = parseEnvLine(line);
                  return (
                    <li key={i}>
                      <p className="text-sm font-bold text-ll-navy">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">{desc}</p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Academic requirements</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-100/90 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Minimum GPA</p>
                  <p className="mt-1.5 text-xl font-bold text-ll-navy">
                    {selected?.minGpa != null ? String(selected.minGpa) : "Not specified"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-100/90 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Student level</p>
                  <p className="mt-1.5 text-xl font-bold text-ll-navy">{formatYearLabel(selected?.preferredYear ?? [])}</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-100/90 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Weekly commitment</p>
                  <p className="mt-1.5 text-xl font-bold text-ll-navy">{selected?.hoursPerWeek ?? "—"}</p>
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
  );
}
