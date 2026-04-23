import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { rankMatchesForStudent } from "@/lib/matching";
import { MatchedForYouCarousel } from "@/components/student/matched-for-you-carousel";
import { CalendarDays, Compass, Sparkles } from "lucide-react";

function pctFromScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score * 100)));
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
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
  const discoverItems = [...rankedItems, ...fallbackItems].slice(0, 20);

  const carouselItems = discoverItems.map((posting) => {
    const meta = matchMetaByPostingId.get(posting.id);
    const matchPct = meta?.vector_score != null ? pctFromScore(meta.vector_score) : null;
    const topic =
      (posting.lab_groups?.research_fields && posting.lab_groups.research_fields[0]) || "Research";
    return {
      id: posting.id,
      title: posting.title,
      labName: posting.lab_groups?.name ?? null,
      university: posting.lab_groups?.university ?? null,
      topic: String(topic),
      matchPct,
    };
  });

  const firstName = (profile?.display_name ?? profile?.email ?? "there").split(/\s+/)[0] ?? "there";
  const appCount = (applications ?? []).length;
  const labCount = (myLabs ?? []).filter((m) => m.lab_groups).length;

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 md:mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-ll-navy sm:text-5xl md:text-6xl">Welcome, {firstName}</h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-600 sm:text-lg">
          Here is your LabLink home base — open roles chosen for you, and tools to run your research search.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Applications</p>
          <p className="mt-1 text-2xl font-bold text-ll-navy">{appCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">My labs</p>
          <p className="mt-1 text-2xl font-bold text-ll-navy">{labCount}</p>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ll-navy">
            <Sparkles className="size-5 text-ll-purple" aria-hidden />
            Matched for you
          </h2>
          <Link
            href="/dashboard/student/search"
            className="text-sm font-medium text-ll-navy underline-offset-2 hover:underline"
          >
            Search all
          </Link>
        </div>
        {discoverItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-600">
            No open opportunities right now, or you have applied to every current listing. Check back soon.
          </div>
        ) : (
          <MatchedForYouCarousel items={carouselItems} />
        )}
      </section>

      <section className="mb-10 rounded-2xl border-2 border-dashed border-ll-purple/30 bg-ll-bg/50 p-8 text-center">
        <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-ll-navy">
          <Compass className="size-5" />
          Discovery
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
          Browsing and recommendations beyond your profile matches are on the way. You will be able to explore labs by field,
          university, and more.
        </p>
        <p className="mt-3 text-xs text-zinc-500">This section is a placeholder for upcoming discovery features.</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/80 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ll-navy">Upcoming deadlines</h2>
            <p className="text-sm text-zinc-600">Track applications from the Applications page.</p>
          </div>
          <Link
            href="/dashboard/student/applications"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ll-navy px-4 py-2.5 text-sm font-semibold text-white"
          >
            <CalendarDays className="size-4" />
            View applications
          </Link>
        </div>
      </section>
    </div>
  );
}
