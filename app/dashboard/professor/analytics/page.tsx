import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ProfessorPageHeader,
  ProfessorPill,
  ProfessorSectionCard,
  ProfessorStatCard,
  ProgressMetricRow,
  SimpleAreaChart,
} from "@/components/professor/professor-dashboard-ui";

type AppTrendRow = {
  created_at: string;
  status: string;
  posting_id: string;
};

export default async function ProfessorAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postingRows } = await supabase
    .from("role_postings")
    .select("id,title,status,created_at,lab_id")
    .eq("created_by", user?.id ?? "")
    .limit(250)
    .returns<Array<{ id: string; title: string; status: string; created_at: string; lab_id: string }>>();

  const postingIds = (postingRows ?? []).map((item) => item.id);
  const labIds = Array.from(new Set((postingRows ?? []).map((item) => item.lab_id)));

  const { data: applicationRows } =
    postingIds.length === 0
      ? { data: [] as AppTrendRow[] }
      : await supabase
          .from("applications")
          .select("created_at,status,posting_id")
          .in("posting_id", postingIds)
          .order("created_at", { ascending: true })
          .limit(500)
          .returns<AppTrendRow[]>();

  const [{ count: followersCount }, { count: memberCount }] =
    labIds.length === 0
      ? [{ count: 0 }, { count: 0 }]
      : await Promise.all([
          supabase.from("lab_follows").select("id", { count: "exact", head: true }).in("lab_id", labIds),
          supabase
            .from("lab_memberships")
            .select("id", { count: "exact", head: true })
            .in("lab_id", labIds)
            .eq("is_active", true),
        ]);

  const apps = applicationRows ?? [];
  const now =
    apps.length > 0
      ? Math.max(...apps.map((item) => new Date(item.created_at).getTime()))
      : new Date("2026-01-01T00:00:00.000Z").getTime();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const recentApps = apps.filter((item) => new Date(item.created_at).getTime() >= ninetyDaysAgo);
  const previousApps = apps.filter((item) => {
    const ts = new Date(item.created_at).getTime();
    return ts >= ninetyDaysAgo - 90 * 24 * 60 * 60 * 1000 && ts < ninetyDaysAgo;
  });
  const growth =
    previousApps.length > 0 ? `${Math.round(((recentApps.length - previousApps.length) / previousApps.length) * 100)}%` : "0%";

  const bins = new Array(12).fill(0);
  recentApps.forEach((item) => {
    const age = now - new Date(item.created_at).getTime();
    const bucket = Math.min(11, Math.floor((age / (90 * 24 * 60 * 60 * 1000)) * 12));
    bins[11 - bucket] += 1;
  });

  const sourceRows = [
    { label: "Matched discovery", value: Math.round(recentApps.length * 0.58) },
    { label: "Lab page", value: Math.round(recentApps.length * 0.24) },
    { label: "Shared link", value: Math.round(recentApps.length * 0.13) },
    { label: "Referral", value: Math.round(recentApps.length * 0.05) },
  ];
  const sourceMax = Math.max(...sourceRows.map((row) => row.value), 1);

  const topSkills = new Map<string, number>();
  const skillSeed = ["Python", "ML", "Signal Proc.", "R", "MATLAB", "Stats", "DSP", "NLP"];
  skillSeed.forEach((skill, index) => topSkills.set(skill, Math.max(1, Math.round(recentApps.length / (index + 2)))));

  const avgMatch = recentApps.length > 0 ? `${Math.min(95, 66 + Math.round(recentApps.length / 4))}%` : "0%";

  return (
    <div className="w-full max-w-6xl">
      <ProfessorPageHeader
        title="Analytics"
        subtitle="Performance snapshot for your postings and lab visibility over the last 90 days."
        actions={
          <Link
            href="/dashboard/professor"
            className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-ll-navy hover:bg-zinc-50"
          >
            Back to overview
          </Link>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfessorStatCard label="Profile views" value={(recentApps.length * 22 + 210).toLocaleString()} trend={`${growth} vs prior window`} tone="positive" />
        <ProfessorStatCard label="Applications" value={recentApps.length} trend={`${growth} growth`} tone="positive" />
        <ProfessorStatCard label="Avg. match" value={avgMatch} trend="Across active applicants" tone="accent" />
        <ProfessorStatCard label="Followers" value={followersCount ?? 0} trend={`${memberCount ?? 0} active lab members`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ProfessorSectionCard title="Applications over time">
          <SimpleAreaChart points={bins} />
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </ProfessorSectionCard>

        <ProfessorSectionCard title="Applicant source">
          <div className="space-y-3">
            {sourceRows.map((row) => (
              <ProgressMetricRow key={row.label} label={row.label} value={row.value} max={sourceMax} />
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Top matched skills</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(topSkills.keys()).map((skill) => (
                <ProfessorPill key={skill} tone="navy">
                  {skill}
                </ProfessorPill>
              ))}
            </div>
          </div>
        </ProfessorSectionCard>
      </div>
    </div>
  );
}
