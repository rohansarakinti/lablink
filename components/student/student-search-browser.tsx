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

  const skills = [...(selected?.requiredSkills ?? []), ...(selected?.preferredSkills ?? [])].filter(Boolean).slice(0, 8);
  const paras = splitDescription(selected?.description ?? null);
  const matchPct = pctFromScore(selected?.vectorScore ?? 0);

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

      {/* Detail */}
      <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-ll-navy via-zinc-800 to-ll-navy md:h-52">
          {selected?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.bannerUrl}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-90"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-white/80">
              {selected?.department ?? selected?.university}
            </p>
            <h3 className="mt-1 text-2xl font-bold leading-tight md:text-3xl">{selected?.labName}</h3>
            <p className="mt-1 text-sm text-white/90">Lead: {selected?.piName}</p>
            <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {matchPct}% match score
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-zinc-100 px-5 py-4">
          <Link
            href={`/postings/${selected?.postingId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-ll-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ll-navy/90"
          >
            Apply now
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-lg border border-ll-purple bg-ll-purple px-5 py-2.5 text-sm font-semibold text-white opacity-90 hover:opacity-100 disabled:cursor-not-allowed"
            disabled
          >
            <Save className="size-4" />
            Save
          </button>
        </div>

        <div className="px-5 py-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Why this match</h4>
          <p className="mt-1 text-sm text-zinc-700">{selected?.reason}</p>
          <h4 className="mt-6 text-lg font-bold text-ll-navy">About the role</h4>
          {paras.length > 0 ? (
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600">
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">No long description is available for this listing yet.</p>
          )}

          {skills.length > 0 ? (
            <>
              <h4 className="mt-8 text-sm font-bold uppercase tracking-wide text-ll-navy">Skills & techniques</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {skills.map((skill) => {
                  const Icon = pickIcon(skill);
                  return (
                    <div
                      key={skill}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm text-zinc-800"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-ll-navy shadow-sm">
                        <Icon className="size-4" />
                      </span>
                      {skill}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Side meta */}
      <div className="w-full shrink-0 space-y-4 lg:max-w-[300px]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">At a glance</h2>
        <div className="rounded-2xl bg-ll-navy p-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">Application deadline</p>
          <p className="mt-1 text-lg font-semibold">
            {selected?.applicationDeadline
              ? new Date(selected.applicationDeadline).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not listed"}
          </p>
          {selected?.isPaid != null && selected.isPaid !== "" ? (
            <p className="mt-2 text-sm text-white/80">Compensation: {selected.isPaid}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Lab environment</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {(selected?.labEnvironment?.length ? selected.labEnvironment : ["Collaborative", "Mentorship-focused", "Project-driven"]).map(
              (line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ll-purple" />
                  <span>{line}</span>
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-cyan-100 bg-[#E4FBFF]/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ll-navy/70">Minimum GPA</p>
            <p className="mt-1 text-lg font-semibold text-ll-navy">
              {selected?.minGpa != null ? String(selected.minGpa) : "Not specified"}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-[#E4FBFF]/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ll-navy/70">Student level</p>
            <p className="mt-1 text-lg font-semibold text-ll-navy">{formatYearLabel(selected?.preferredYear ?? [])}</p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-[#E4FBFF]/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ll-navy/70">Weekly commitment</p>
            <p className="mt-1 text-lg font-semibold text-ll-navy">{selected?.hoursPerWeek ?? "—"}</p>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Results for &quot;{query}&quot; · ordered by vector similarity, then re-ranked
        </p>
      </div>
    </div>
  );
}
