import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ProfessorPageHeader,
  ProfessorPill,
  ProfessorSectionCard,
  ProfessorStatCard,
  ProgressMetricRow,
} from "@/components/professor/professor-dashboard-ui";

type ActivityRow = {
  id: string;
  created_at: string;
  status: string;
  student_id: string;
  role_postings: {
    id: string;
    title: string;
    status: string;
    application_deadline: string | null;
    lab_groups: {
      name: string;
    } | null;
  } | null;
};

export default async function ProfessorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ display_name: string | null; email: string }>();

  const firstName = (profile?.display_name ?? profile?.email ?? "there").split(/\s+/)[0] ?? "there";

  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select("lab_role,lab_groups(id,name,tagline,university,banner_url,logo_url)")
    .eq("user_id", user?.id ?? "")
    .eq("is_active", true)
    .order("joined_at", { ascending: false })
    .returns<
      Array<{
        lab_role: string;
        lab_groups: {
          id: string;
          name: string;
          tagline: string | null;
          university: string;
          banner_url: string | null;
          logo_url: string | null;
        } | null;
      }>
    >();

  const labs = (memberships ?? []).filter((membership) => membership.lab_groups);

  const { data: postingRows } = await supabase
    .from("role_postings")
    .select("id,lab_id,title,status,created_at,application_deadline")
    .eq("created_by", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(150)
    .returns<
      Array<{
        id: string;
        lab_id: string;
        title: string;
        status: string;
        created_at: string;
        application_deadline: string | null;
      }>
    >();

  const postingIds = (postingRows ?? []).map((posting) => posting.id);
  const activePostingCount = (postingRows ?? []).filter((posting) => posting.status === "open").length;

  const { data: recentApplications } =
    postingIds.length === 0
      ? { data: [] as ActivityRow[] }
      : await supabase
          .from("applications")
          .select("id,created_at,status,student_id,role_postings(id,title,status,application_deadline,lab_groups(name))")
          .in("posting_id", postingIds)
          .order("created_at", { ascending: false })
          .limit(220)
          .returns<ActivityRow[]>();

  const { count: applicationCount } =
    postingIds.length === 0
      ? { count: 0 }
      : await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("posting_id", postingIds);

  const applicationRows = recentApplications ?? [];
  const recentActivity = applicationRows.slice(0, 6);
  const mostRecentApplicationTs =
    applicationRows.length > 0
      ? Math.max(...applicationRows.map((item) => new Date(item.created_at).getTime()))
      : 0;
  const recentWeekCutoff = mostRecentApplicationTs - 7 * 24 * 60 * 60 * 1000;
  const weeklyApplications = applicationRows.filter(
    (item) => new Date(item.created_at).getTime() >= recentWeekCutoff,
  ).length;
  const byStatus = new Map<string, number>();
  applicationRows.forEach((row) => {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  });
  const interviewsCount = (byStatus.get("interview") ?? 0) + (byStatus.get("interviewing") ?? 0);
  const reviewedCount =
    (byStatus.get("screening") ?? 0) +
    (byStatus.get("interview") ?? 0) +
    (byStatus.get("interviewing") ?? 0) +
    (byStatus.get("offered") ?? 0) +
    (byStatus.get("accepted") ?? 0) +
    (byStatus.get("rejected") ?? 0);
  const reviewRate =
    (applicationCount ?? 0) > 0 ? `${Math.round((reviewedCount / Math.max(applicationCount ?? 0, 1)) * 100)}%` : "0%";

  const studentIds = Array.from(new Set(applicationRows.map((item) => item.student_id)));
  const { data: applicantProfiles } =
    studentIds.length === 0
      ? { data: [] as Array<{ id: string; display_name: string | null; email: string }> }
      : await supabase.from("profiles").select("id,display_name,email").in("id", studentIds);
  const applicantById = new Map<string, { display_name: string | null; email: string }>();
  (applicantProfiles ?? []).forEach((profileRow) => applicantById.set(profileRow.id, profileRow));

  const interviewRows = applicationRows
    .filter((row) => row.status === "interview" || row.status === "interviewing")
    .slice(0, 4)
    .map((row) => {
      const profileRow = applicantById.get(row.student_id);
      return {
        id: row.id,
        studentName: profileRow?.display_name || profileRow?.email || "Applicant",
        postingTitle: row.role_postings?.title ?? "Posting",
        createdAt: row.created_at,
      };
    });

  const applicationCountByPosting = new Map<string, number>();
  applicationRows.forEach((row) => {
    if (row.role_postings?.id) {
      applicationCountByPosting.set(row.role_postings.id, (applicationCountByPosting.get(row.role_postings.id) ?? 0) + 1);
    }
  });
  const postingCards = (postingRows ?? []).slice(0, 3);
  const pipelineRows = [
    { label: "New", value: byStatus.get("submitted") ?? 0 },
    { label: "Screening", value: byStatus.get("screening") ?? 0 },
    { label: "Interview", value: interviewsCount },
    { label: "Offer", value: (byStatus.get("offered") ?? 0) + (byStatus.get("accepted") ?? 0) },
  ];
  const pipelineMax = Math.max(...pipelineRows.map((item) => item.value), 1);

  return (
    <div className="w-full max-w-6xl">
      <ProfessorPageHeader
        title={`Good afternoon, Prof. ${firstName}`}
        subtitle="Manage labs, triage applicants, and monitor momentum from one workspace."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfessorStatCard label="Active postings" value={activePostingCount} />
        <ProfessorStatCard label="Applicants" value={applicationCount ?? 0} trend={`${weeklyApplications} this week`} tone="positive" />
        <ProfessorStatCard label="Interviews scheduled" value={interviewsCount} trend="Stable pipeline" />
        <ProfessorStatCard label="Review completion" value={reviewRate} trend="Across all applications" tone="accent" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ProfessorSectionCard
          title="Applicant Status"
          action={
            <Link href="/dashboard/professor/analytics" className="text-xs font-semibold uppercase tracking-wide text-ll-purple">
              View analytics →
            </Link>
          }
        >
          <div className="space-y-3">
            {pipelineRows.map((row) => (
              <ProgressMetricRow key={row.label} label={row.label} value={row.value} max={pipelineMax} />
            ))}
          </div>
        </ProfessorSectionCard>

        <ProfessorSectionCard title="Upcoming interviews">
          {interviewRows.length === 0 ? (
            <p className="text-sm text-zinc-600">No interviews yet. Move screened candidates to interview to see them here.</p>
          ) : (
            <ul className="space-y-3">
              {interviewRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ll-navy">{row.studentName}</p>
                    <p className="truncate text-xs text-zinc-600">{row.postingTitle}</p>
                  </div>
                  <p className="whitespace-nowrap text-xs font-medium text-ll-purple">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ProfessorSectionCard>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ll-navy">Your postings</h2>
        </div>
        {postingCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
            No postings yet. Create your first opportunity to begin receiving applications.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {postingCards.map((posting) => (
              <article key={posting.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="line-clamp-2 text-sm font-semibold text-ll-navy">{posting.title}</h3>
                <div className="mt-3 flex items-center gap-2">
                  <ProfessorPill tone={posting.status === "open" ? "positive" : "neutral"}>{posting.status}</ProfessorPill>
                  <ProfessorPill tone="accent">{applicationCountByPosting.get(posting.id) ?? 0} applicants</ProfessorPill>
                </div>
                <p className="mt-3 text-xs text-zinc-600">
                  {posting.application_deadline
                    ? `Deadline: ${new Date(posting.application_deadline).toLocaleDateString()}`
                    : "No deadline set"}
                </p>
                <Link
                  href={`/labs/${posting.lab_id}/postings/${posting.id}/applicants`}
                  className="mt-3 inline-block text-sm font-medium text-ll-navy underline"
                >
                  Review applicants
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ll-navy">My labs</h2>
          <Link href="/labs/new" className="text-sm font-medium text-ll-navy underline">
            Create lab
          </Link>
        </div>
        {labs.length === 0 ? (
          <p className="text-sm text-ll-gray">No labs yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {labs.map((membership) =>
              membership.lab_groups ? (
                <Link key={membership.lab_groups.id} href={`/labs/${membership.lab_groups.id}`} className="group block">
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-zinc-100">
                      {membership.lab_groups.banner_url ? (
                        <Image
                          src={membership.lab_groups.banner_url}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ll-navy/15 via-zinc-100 to-ll-purple/10">
                          {membership.lab_groups.logo_url ? (
                            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-md">
                              <Image
                                src={membership.lab_groups.logo_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <span className="text-4xl font-bold text-zinc-400" aria-hidden>
                              {membership.lab_groups.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="inline-flex self-start rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-700">
                        {membership.lab_role.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-3 text-base font-semibold text-ll-navy">{membership.lab_groups.name}</h3>
                      <p className="mt-1 text-sm text-zinc-600">{membership.lab_groups.university}</p>
                      {membership.lab_groups.tagline ? (
                        <p className="mt-2 line-clamp-2 text-sm text-ll-gray">{membership.lab_groups.tagline}</p>
                      ) : null}
                      <span className="mt-auto inline-block pt-4 text-sm font-medium text-ll-navy underline">
                        Manage lab
                      </span>
                    </div>
                  </article>
                </Link>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ll-navy">Recent activity</h2>
          <Link href="/dashboard/professor/analytics" className="text-sm font-medium text-ll-navy underline">
            Open analytics
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-ll-gray">No applications yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-ll-navy">
                  {activity.role_postings?.title ?? "Role posting"} at{" "}
                  {activity.role_postings?.lab_groups?.name ?? "your lab"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ProfessorPill tone={activity.status === "submitted" ? "accent" : "neutral"}>{activity.status}</ProfessorPill>
                  <span className="text-zinc-600">{new Date(activity.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
