import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { rankMatchesForStudent } from "@/lib/matching";

type StudentTab = "feed" | "discover" | "applications" | "labs";

const tabs: Array<{ id: StudentTab; label: string }> = [
  { id: "feed", label: "Feed" },
  { id: "discover", label: "Discover" },
  { id: "applications", label: "Applications" },
  { id: "labs", label: "My Labs" },
];

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const query = await searchParams;
  const activeTab = tabs.some((tab) => tab.id === query.tab) ? (query.tab as StudentTab) : "feed";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: profileGate } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profileGate || profileGate.role !== "student") {
    redirect("/dashboard/professor");
  }

  if (!profileGate.onboarding_complete) {
    redirect("/onboarding/student");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; email: string }>();

  const { data: cachedMatchesBefore } = await supabase
    .from("match_cache")
    .select("posting_id,llm_rank,vector_score,computed_at")
    .eq("student_id", user.id)
    .order("llm_rank", { ascending: true, nullsFirst: false })
    .order("vector_score", { ascending: false })
    .limit(100)
    .returns<
      Array<{
        posting_id: string;
        llm_rank: number | null;
        vector_score: number;
        computed_at: string;
      }>
    >();

  const cacheIsStale =
    !cachedMatchesBefore?.length ||
    Date.now() - new Date(cachedMatchesBefore[0].computed_at).getTime() > 1000 * 60 * 30;

  if (cacheIsStale) {
    await rankMatchesForStudent(user.id);
  }

  const { data: cachedMatchesAfter } = await supabase
    .from("match_cache")
    .select("posting_id,llm_rank,vector_score,llm_reason")
    .eq("student_id", user.id)
    .order("llm_rank", { ascending: true, nullsFirst: false })
    .order("vector_score", { ascending: false })
    .limit(100)
    .returns<
      Array<{
        posting_id: string;
        llm_rank: number | null;
        vector_score: number;
        llm_reason: string | null;
      }>
    >();

  const { data: discoverPostings } = await supabase
    .from("role_postings")
    .select("id,lab_id,title,status,is_paid,hours_per_week,application_deadline,lab_groups(name,university,logo_url,research_fields)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<
      Array<{
        id: string;
        lab_id: string;
        title: string;
        status: string;
        is_paid: string | null;
        hours_per_week: string | null;
        application_deadline: string | null;
        lab_groups: {
          name: string;
          university: string;
          logo_url: string | null;
          research_fields: string[] | null;
        } | null;
      }>
    >();

  const { data: applications } = await supabase
    .from("applications")
    .select("id,posting_id,status,created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Array<{ id: string; posting_id: string; status: string; created_at: string }>>();

  const postingIds = Array.from(new Set((applications ?? []).map((application) => application.posting_id)));
  const { data: appliedPostings } =
    postingIds.length === 0
      ? { data: [] as Array<{ id: string; title: string; application_deadline: string | null; lab_id: string }> }
      : await supabase
          .from("role_postings")
          .select("id,title,application_deadline,lab_id")
          .in("id", postingIds)
          .returns<Array<{ id: string; title: string; application_deadline: string | null; lab_id: string }>>();

  const appliedLabIds = Array.from(new Set((appliedPostings ?? []).map((posting) => posting.lab_id)));
  const { data: appliedLabs } =
    appliedLabIds.length === 0
      ? { data: [] as Array<{ id: string; name: string; university: string; logo_url: string | null }> }
      : await supabase
          .from("lab_groups")
          .select("id,name,university,logo_url")
          .in("id", appliedLabIds)
          .returns<Array<{ id: string; name: string; university: string; logo_url: string | null }>>();

  const postingById = new Map((appliedPostings ?? []).map((posting) => [posting.id, posting]));
  const appliedLabById = new Map((appliedLabs ?? []).map((lab) => [lab.id, lab]));
  const appliedPostingIdSet = new Set((applications ?? []).map((application) => application.posting_id));
  const discoverPool = (discoverPostings ?? []).filter((posting) => !appliedPostingIdSet.has(posting.id));
  const discoverById = new Map(discoverPool.map((posting) => [posting.id, posting]));
  const matchMetaByPostingId = new Map(
    (cachedMatchesAfter ?? []).map((match) => [match.posting_id, match]),
  );
  const rankedItems = (cachedMatchesAfter ?? [])
    .map((match) => discoverById.get(match.posting_id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const fallbackItems = discoverPool.filter(
    (posting) => !(cachedMatchesAfter ?? []).some((match) => match.posting_id === posting.id),
  );
  const discoverItems = [...rankedItems, ...fallbackItems];

  const { data: myLabs } = await supabase
    .from("lab_memberships")
    .select("id,joined_at,lab_role,lab_groups(id,name,logo_url,university)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("lab_role", ["undergrad_ra", "lab_technician", "volunteer", "grad_researcher", "postdoc"])
    .order("joined_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        joined_at: string;
        lab_role: string;
        lab_groups: { id: string; name: string; logo_url: string | null; university: string } | null;
      }>
    >();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <h1 className="text-3xl font-semibold text-ll-navy">Student dashboard</h1>
      <p className="mt-2 text-sm text-ll-gray">
        Welcome {profile?.display_name ?? profile?.email ?? "student"}.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/student?tab=${tab.id}`}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-ll-navy bg-ll-navy text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "feed" ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-ll-navy">Feed</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Personalized feed is the next step. Use Discover and Applications tabs for now.
          </p>
        </section>
      ) : null}

      {activeTab === "discover" ? (
        <section className="mt-6">
          {discoverItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
              No open opportunities right now (or you already applied to all current listings).
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {discoverItems.map((posting) => (
                <article key={posting.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {posting.lab_groups?.name ?? "Lab"} · {posting.lab_groups?.university ?? "University"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-ll-navy">{posting.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                    {matchMetaByPostingId.get(posting.id)?.llm_rank ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-800">
                        rank #{matchMetaByPostingId.get(posting.id)?.llm_rank}
                      </span>
                    ) : null}
                    {matchMetaByPostingId.get(posting.id)?.vector_score != null ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                        score {matchMetaByPostingId.get(posting.id)?.vector_score.toFixed(2)}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-zinc-100 px-2 py-1">{posting.is_paid ?? "unspecified pay"}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1">{posting.hours_per_week ?? "hours tbd"}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1">
                      deadline:{" "}
                      {posting.application_deadline
                        ? new Date(posting.application_deadline).toLocaleDateString()
                        : "none"}
                    </span>
                  </div>
                  {matchMetaByPostingId.get(posting.id)?.llm_reason ? (
                    <p className="mt-3 text-xs text-zinc-600">{matchMetaByPostingId.get(posting.id)?.llm_reason}</p>
                  ) : null}
                  <Link
                    href={`/postings/${posting.id}`}
                    className="mt-4 inline-block text-sm font-medium text-ll-navy underline"
                  >
                    View details and apply
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "applications" ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-ll-navy">My applications</h2>
          {(applications ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No applications yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(applications ?? []).map((application) => {
                const posting = postingById.get(application.posting_id);
                const lab = posting ? appliedLabById.get(posting.lab_id) : null;
                return (
                  <li key={application.id} className="rounded-xl border border-zinc-200 p-4">
                    <p className="font-medium text-ll-navy">
                      {posting?.title ?? "Role posting"} · {lab?.name ?? "Lab"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Status: {application.status} · Applied {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {activeTab === "labs" ? (
        <section className="mt-6">
          {(myLabs ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
              You have not joined any labs yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(myLabs ?? []).map((membership) =>
                membership.lab_groups ? (
                  <article key={membership.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-ll-navy">{membership.lab_groups.name}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{membership.lab_groups.university}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                      Role: {membership.lab_role.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Joined {new Date(membership.joined_at).toLocaleDateString()}
                    </p>
                  </article>
                ) : null,
              )}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
