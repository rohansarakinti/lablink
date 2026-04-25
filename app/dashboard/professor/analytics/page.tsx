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
  student_id: string;
};

export default async function ProfessorAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postingRows } = await supabase
    .from("role_postings")
    .select("id,title,status,created_at,lab_id,required_skills,preferred_skills")
    .eq("created_by", user?.id ?? "")
    .limit(250)
    .returns<
      Array<{
        id: string;
        title: string;
        status: string;
        created_at: string;
        lab_id: string;
        required_skills: string[] | null;
        preferred_skills: string[] | null;
      }>
    >();

  const postingIds = (postingRows ?? []).map((item) => item.id);
  const labIds = Array.from(new Set((postingRows ?? []).map((item) => item.lab_id)));

  const { data: applicationRows } =
    postingIds.length === 0
      ? { data: [] as AppTrendRow[] }
      : await supabase
          .from("applications")
          .select("created_at,status,posting_id,student_id")
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

  const statusRows = [
    { label: "Submitted", value: recentApps.filter((item) => item.status === "submitted").length },
    {
      label: "Reviewing",
      value: recentApps.filter((item) => item.status === "reviewing").length,
    },
    { label: "Interview", value: recentApps.filter((item) => item.status === "interview").length },
    { label: "Accepted", value: recentApps.filter((item) => item.status === "accepted").length },
    { label: "Rejected", value: recentApps.filter((item) => item.status === "rejected").length },
  ];
  const statusMax = Math.max(...statusRows.map((row) => row.value), 1);

  const recentStudentIds = Array.from(new Set(recentApps.map((item) => item.student_id)));
  const { data: recentStudents } =
    recentStudentIds.length === 0
      ? { data: [] as Array<{ id: string; skills: string[] | null }> }
      : await supabase.from("student_profiles").select("id,skills").in("id", recentStudentIds);

  const skillsByStudent = new Map<string, string[]>();
  (recentStudents ?? []).forEach((student) => {
    skillsByStudent.set(student.id, student.skills ?? []);
  });

  const postingById = new Map(
    (postingRows ?? []).map((posting) => [
      posting.id,
      {
        required: posting.required_skills ?? [],
        preferred: posting.preferred_skills ?? [],
      },
    ]),
  );

  const topSkillsMap = new Map<string, number>();
  recentApps.forEach((application) => {
    const skills = skillsByStudent.get(application.student_id) ?? [];
    skills.forEach((skill) => {
      const normalized = skill.trim();
      if (normalized) {
        topSkillsMap.set(normalized, (topSkillsMap.get(normalized) ?? 0) + 1);
      }
    });
  });
  const topSkills = Array.from(topSkillsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);

  const appFitScores = recentApps
    .map((application) => {
      const postingSkills = postingById.get(application.posting_id);
      if (!postingSkills) return null;
      const studentSkills = new Set((skillsByStudent.get(application.student_id) ?? []).map((skill) => skill.toLowerCase()));
      const required = postingSkills.required.map((skill) => skill.toLowerCase());
      const preferred = postingSkills.preferred.map((skill) => skill.toLowerCase());

      const requiredHits = required.filter((skill) => studentSkills.has(skill)).length;
      const preferredHits = preferred.filter((skill) => studentSkills.has(skill)).length;
      const requiredScore = required.length > 0 ? requiredHits / required.length : 1;
      const preferredScore = preferred.length > 0 ? preferredHits / preferred.length : 1;
      return requiredScore * 0.7 + preferredScore * 0.3;
    })
    .filter((score): score is number => score !== null);
  const avgMatch =
    appFitScores.length > 0 ? `${Math.round((appFitScores.reduce((acc, score) => acc + score, 0) / appFitScores.length) * 100)}%` : "0%";

  const activePostingCount = (postingRows ?? []).filter((posting) => posting.status === "open").length;
  const acceptanceRate =
    recentApps.length > 0
      ? `${Math.round((recentApps.filter((item) => item.status === "accepted").length / recentApps.length) * 100)}%`
      : "0%";

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
        <ProfessorStatCard label="Applications (90d)" value={recentApps.length} trend={`${growth} vs prior window`} tone="positive" />
        <ProfessorStatCard label="Followers" value={followersCount ?? 0} trend={`${memberCount ?? 0} active lab members`} />
        <ProfessorStatCard label="Skill fit (avg)" value={avgMatch} trend="Applicant skill overlap" tone="accent" />
        <ProfessorStatCard label="Open postings" value={activePostingCount} trend={`${acceptanceRate} accepted`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ProfessorSectionCard title="Applications over time">
          <SimpleAreaChart points={bins} />
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </ProfessorSectionCard>

        <ProfessorSectionCard title="Application stages">
          <div className="space-y-3">
            {statusRows.map((row) => (
              <ProgressMetricRow key={row.label} label={row.label} value={row.value} max={statusMax} />
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Top applicant skills (90d)</p>
            {topSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topSkills.map((skill) => (
                  <ProfessorPill key={skill} tone="navy">
                    {skill}
                  </ProfessorPill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No student skills found in recent applications.</p>
            )}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Followers: {followersCount ?? 0} · Active lab members: {memberCount ?? 0}
          </p>
        </ProfessorSectionCard>
      </div>
    </div>
  );
}
