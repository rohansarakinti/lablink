import type { ReactNode } from "react";
import { ArrowUpRight, Minus } from "lucide-react";

type TrendTone = "positive" | "neutral" | "accent";

export function ProfessorPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="ll-animate-fade-up rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ll-navy md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-base text-zinc-600 md:text-lg">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function ProfessorStatCard({
  label,
  value,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  trend?: string;
  tone?: TrendTone;
}) {
  const trendClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "accent"
        ? "text-ll-purple"
        : "text-zinc-500";

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ll-navy">{value}</p>
      {trend ? (
        <p className={`mt-2 inline-flex items-center gap-1 text-base font-medium ${trendClass}`}>
          {tone === "positive" ? <ArrowUpRight className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
          {trend}
        </p>
      ) : null}
    </article>
  );
}

export function ProfessorSectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow duration-250 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ll-navy md:text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProfessorPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "navy" | "positive";
}) {
  const classes =
    tone === "accent"
      ? "bg-ll-purple/20 text-ll-navy"
      : tone === "navy"
        ? "bg-ll-navy text-white"
        : tone === "positive"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${classes}`}>{children}</span>;
}

export function ProgressMetricRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-base text-zinc-600">
        <span>{label}</span>
        <span className="font-semibold text-zinc-700">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div className="h-2 rounded-full bg-ll-purple" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function SimpleAreaChart({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  const width = 560;
  const height = 180;
  const horizontalStep = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points
    .map((value, index) => {
      const x = index * horizontalStep;
      const y = height - (value / max) * (height - 12);
      return `${x},${Math.round(y)}`;
    })
    .join(" ");

  const area = `${coords} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
      <defs>
        <linearGradient id="ll-prof-line" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ll-purple)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--ll-purple)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#ll-prof-line)" />
      <polyline points={coords} fill="none" stroke="var(--ll-purple)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
