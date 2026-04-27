import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { rankMatchesForStudent } from "@/lib/matching";
import { MatchedForYouCarousel } from "@/components/student/matched-for-you-carousel";
import { RecommendedLabsCarousel, type RecommendedLabItem } from "@/components/student/recommended-labs-carousel";
import { RecentApplicationActivity, type ApplicationActivityItem } from "@/components/student/recent-application-activity";
import { ProgressMetricRow } from "@/components/professor/professor-dashboard-ui";
import {
  StudentForYouFeed,
  type ForYouFeedLabPosting,
  type ForYouFeedPost,
} from "@/components/student/student-for-you-feed";
import { Building2, Sparkles } from "lucide-react";

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

  type DiscoverPostingRow = {
    id: string;
    lab_id: string;
    title: string;
    status: string;
    is_paid: string | null;
    hours_per_week: string | null;
    application_deadline: string | null;
    created_at: string;
    lab_groups: {
      name: string;
      university: string;
      logo_url: string | null;
      research_fields: string[] | null;
    } | null;
  };

  const { data: recentOpenPostings } = await supabase
    .from("role_postings")
    .select(
      "id,lab_id,title,status,is_paid,hours_per_week,application_deadline,created_at,lab_groups(name,university,logo_url,research_fields)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(24)
    .returns<DiscoverPostingRow[]>();

  const { data: applications } = await supabase
    .from("applications")
    .select("id,posting_id,status,created_at,status_updated_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .returns<
      Array<{ id: string; posting_id: string; status: string; created_at: string; status_updated_at: string }>
    >();

  const matchedPostingIds = Array.from(new Set((cachedMatchesAfter ?? []).map((match) => match.posting_id)));
  const { data: matchedOpenPostings } =
    matchedPostingIds.length === 0
      ? { data: [] as DiscoverPostingRow[] }
      : await supabase
          .from("role_postings")
          .select(
            "id,lab_id,title,status,is_paid,hours_per_week,application_deadline,created_at,lab_groups(name,university,logo_url,research_fields)",
          )
          .in("id", matchedPostingIds)
          .eq("status", "open")
          .returns<DiscoverPostingRow[]>();

  const discoverPostingById = new Map<string, DiscoverPostingRow>();
  for (const posting of matchedOpenPostings ?? []) {
    discoverPostingById.set(posting.id, posting);
  }
  for (const posting of recentOpenPostings ?? []) {
    if (!discoverPostingById.has(posting.id)) {
      discoverPostingById.set(posting.id, posting);
    }
  }
  const discoverPostings = Array.from(discoverPostingById.values());

  const appPostingIdList = Array.from(new Set((applications ?? []).map((a) => a.posting_id)));
  const { data: applicationPostings } =
    appPostingIdList.length === 0
      ? { data: [] as Array<{ id: string; title: string; lab_id: string; lab_groups: { name: string; logo_url: string | null } | null }> }
      : await supabase
          .from("role_postings")
          .select("id, title, lab_id, lab_groups ( name, logo_url )")
          .in("id", appPostingIdList)
          .returns<
            Array<{
              id: string;
              title: string;
              lab_id: string;
              lab_groups: { name: string; logo_url: string | null } | null;
            }>
          >();
  const applicationPostingById = new Map((applicationPostings ?? []).map((p) => [p.id, p]));

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
  const discoverPool = discoverPostings.filter((posting) => !appliedPostingIdSet.has(posting.id));
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

  const recommendedLabItems: RecommendedLabItem[] = [];
  const seenLabIds = new Set<string>();
  const maxRecommendedLabs = 12;
  const pushLabFromPosting = (posting: (typeof discoverPool)[0]) => {
    if (seenLabIds.has(posting.lab_id)) return;
    seenLabIds.add(posting.lab_id);
    const meta = matchMetaByPostingId.get(posting.id);
    const matchPct = meta?.vector_score != null ? pctFromScore(meta.vector_score) : null;
    const topic =
      (posting.lab_groups?.research_fields && posting.lab_groups.research_fields[0]) || "Research";
    recommendedLabItems.push({
      id: posting.lab_id,
      name: posting.lab_groups?.name ?? "Lab",
      university: posting.lab_groups?.university ?? null,
      topic: String(topic),
      matchPct,
    });
  };
  for (const posting of discoverItems) {
    if (recommendedLabItems.length >= maxRecommendedLabs) break;
    pushLabFromPosting(posting);
  }
  if (recommendedLabItems.length < maxRecommendedLabs) {
    for (const posting of discoverPool) {
      if (recommendedLabItems.length >= maxRecommendedLabs) break;
      pushLabFromPosting(posting);
    }
  }

  const recentActivityItems: ApplicationActivityItem[] = [...(applications ?? [])]
    .sort((a, b) => new Date(b.status_updated_at).getTime() - new Date(a.status_updated_at).getTime())
    .slice(0, 8)
    .map((a) => {
      const p = applicationPostingById.get(a.posting_id);
      const lab = p?.lab_groups;
      return {
        id: a.id,
        status: a.status,
        statusUpdatedAt: a.status_updated_at,
        roleTitle: p?.title ?? "Role posting",
        labName: lab?.name ?? "Lab",
        labLogoUrl: lab?.logo_url ?? null,
      };
    });

  const { data: followRows } = await supabase
    .from("lab_follows")
    .select("lab_id")
    .eq("student_id", user.id);
  const followedLabIds = new Set((followRows ?? []).map((r) => r.lab_id));

  const interestLabIdList: string[] = [];
  const pushUniqueLab = (id: string) => {
    if (id && !interestLabIdList.includes(id)) interestLabIdList.push(id);
  };
  for (const id of followedLabIds) {
    pushUniqueLab(id);
  }
  for (const lab of recommendedLabItems) {
    pushUniqueLab(lab.id);
  }
  for (const row of discoverItems) {
    pushUniqueLab(row.lab_id);
  }
  const interestCap = interestLabIdList.slice(0, 24);

  type ForYouPostRow = {
    id: string;
    lab_id: string;
    caption: string;
    media: { url: string; type: string; alt?: string }[] | null;
    created_at: string;
    author_id: string;
    lab_groups: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
    profiles:
      | { display_name: string | null; avatar_url: string | null }
      | { display_name: string | null; avatar_url: string | null }[]
      | null;
  };
  const one = <T,>(r: T | T[] | null | undefined) => (Array.isArray(r) ? (r[0] ?? null) : r ?? null);

  let interestList: ForYouPostRow[] = [];
  if (interestCap.length > 0) {
    const { data: interest } = await supabase
      .from("lab_posts")
      .select(
        "id, lab_id, caption, media, created_at, author_id, lab_groups ( name, logo_url ), profiles ( display_name, avatar_url )",
      )
      .in("lab_id", interestCap)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<ForYouPostRow[]>();
    interestList = interest ?? [];
  }

  let communityList: ForYouPostRow[] = [];
  if (interestList.length === 0) {
    const { data: community } = await supabase
      .from("lab_posts")
      .select(
        "id, lab_id, caption, media, created_at, author_id, lab_groups ( name, logo_url ), profiles ( display_name, avatar_url )",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<ForYouPostRow[]>();
    communityList = community ?? [];
  }

  const rawFeed: ForYouPostRow[] = interestList.length > 0 ? interestList : communityList;
  const isBroadCommunityFeed = interestList.length === 0;

  const forYouFeedPosts: ForYouFeedPost[] = [...rawFeed]
    .sort((a, b) => {
      const af = followedLabIds.has(a.lab_id) ? 1 : 0;
      const bf = followedLabIds.has(b.lab_id) ? 1 : 0;
      if (af !== bf) {
        return bf - af;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 12)
    .map((r) => {
      const lab = one(r.lab_groups);
      const prof = one(r.profiles);
      const media = Array.isArray(r.media) ? r.media : [];
      return {
        id: r.id,
        labId: r.lab_id,
        caption: r.caption,
        media,
        createdAt: r.created_at,
        labName: lab?.name ?? "Lab",
        labLogoUrl: lab?.logo_url ?? null,
        authorDisplayName: prof?.display_name ?? null,
        authorAvatarUrl: prof?.avatar_url ?? null,
      };
    });

  const forYouLabIds = Array.from(new Set(forYouFeedPosts.map((p) => p.labId)));
  const forYouOpenPostingsByLabId: Record<string, ForYouFeedLabPosting[]> = Object.fromEntries(
    forYouLabIds.map((id) => [id, [] as ForYouFeedLabPosting[]]),
  );
  if (forYouLabIds.length > 0) {
    type ForYouOpenPostingRow = {
      id: string;
      lab_id: string;
      title: string;
      application_deadline: string | null;
      created_at: string;
    };
    const { data: openForFeedLabs } = await supabase
      .from("role_postings")
      .select("id, lab_id, title, application_deadline, created_at")
      .in("lab_id", forYouLabIds)
      .eq("status", "open")
      .returns<ForYouOpenPostingRow[]>();
    const byLab = new Map<string, ForYouOpenPostingRow[]>();
    for (const row of openForFeedLabs ?? []) {
      if (!byLab.has(row.lab_id)) {
        byLab.set(row.lab_id, []);
      }
      byLab.get(row.lab_id)!.push(row);
    }
    for (const [labId, rows] of byLab) {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      forYouOpenPostingsByLabId[labId] = rows.slice(0, 6).map((r) => ({
        id: r.id,
        title: r.title,
        applicationDeadline: r.application_deadline,
      }));
    }
  }

  const firstName = (profile?.display_name ?? profile?.email ?? "there").split(/\s+/)[0] ?? "there";
  const appCount = (applications ?? []).length;
  const labCount = (myLabs ?? []).filter((m) => m.lab_groups).length;
  const applicationStatusCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicationStatusCounts.set(application.status, (applicationStatusCounts.get(application.status) ?? 0) + 1);
  }
  const interviewsCount =
    (applicationStatusCounts.get("interview") ?? 0) + (applicationStatusCounts.get("interviewing") ?? 0);
  const offeredCount = (applicationStatusCounts.get("offered") ?? 0) + (applicationStatusCounts.get("accepted") ?? 0);
  const pipelineRows = [
    { label: "Applied", value: applicationStatusCounts.get("submitted") ?? 0 },
    { label: "Screening", value: applicationStatusCounts.get("screening") ?? 0 },
    { label: "Interview", value: interviewsCount },
    { label: "Offers", value: offeredCount },
  ];
  const pipelineMax = Math.max(...pipelineRows.map((row) => row.value), 1);

  return (
    <div className="w-full max-w-6xl">
      <div className="ll-animate-fade-up mb-8 md:mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-ll-navy sm:text-5xl md:text-6xl">Welcome, {firstName}</h1>
        <p className="ll-animate-fade-up ll-delay-100 mt-3 max-w-2xl text-base text-zinc-600 sm:text-lg">
          Here is your LabLink home base, open roles chosen for you, and tools to run your research search.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="ll-animate-scale-in ll-delay-100 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-base font-semibold uppercase tracking-wide text-zinc-500">Applications</p>
          <p className="mt-1 text-3xl font-bold text-ll-navy tabular-nums transition-colors duration-200">{appCount}</p>
        </div>
        <div className="ll-animate-scale-in ll-delay-200 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-base font-semibold uppercase tracking-wide text-zinc-500">My labs</p>
          <p className="mt-1 text-3xl font-bold text-ll-navy tabular-nums transition-colors duration-200">{labCount}</p>
        </div>
      </div>

      <section className="ll-animate-fade-up ll-delay-150 mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ll-navy md:text-2xl">Application pipeline</h2>
          <Link href="/dashboard/student/applications" className="text-base font-semibold uppercase tracking-wide text-ll-purple">
            View applications →
          </Link>
        </div>
        {appCount === 0 ? (
          <p className="text-lg text-zinc-600">Apply to open roles to start tracking your pipeline here.</p>
        ) : (
          <div className="space-y-3">
            {pipelineRows.map((row) => (
              <ProgressMetricRow key={row.label} label={row.label} value={row.value} max={pipelineMax} />
            ))}
          </div>
        )}
      </section>

      <section className="ll-animate-fade-up ll-delay-200 mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="group flex items-center gap-2 text-xl font-bold text-ll-navy">
            <Sparkles
              className="size-5 text-ll-purple transition-transform duration-300 group-hover:rotate-6"
              aria-hidden
            />
            Matched for you
          </h2>
          <Link
            href="/dashboard/student/search"
            className="text-base font-medium text-ll-navy underline-offset-2 transition-all duration-200 hover:underline"
          >
            Search all
          </Link>
        </div>
        {discoverItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-base text-zinc-600">
            No open opportunities right now, or you have applied to every current listing. Check back soon.
          </div>
        ) : (
          <MatchedForYouCarousel items={carouselItems} />
        )}
      </section>

      <section className="ll-animate-fade-up ll-delay-300 mb-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="group flex items-center gap-2 text-xl font-bold text-ll-navy">
            <Building2
              className="size-5 text-ll-purple transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden
            />
            Recommended labs
          </h2>
        </div>
        <p className="mb-3 max-w-2xl text-base text-zinc-600">
          Labs surfaced from the same match scores as your role suggestions, explore their profile, open roles, and public feed in one place.
        </p>
        {recommendedLabItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-base text-zinc-600">
            No lab suggestions yet. Complete your profile and check back, or use Search to find opportunities.
          </div>
        ) : (
          <RecommendedLabsCarousel items={recommendedLabItems} />
        )}
      </section>

      <div className="ll-animate-fade-up ll-delay-400 mb-10 space-y-10">
        <RecentApplicationActivity items={recentActivityItems} />
        <StudentForYouFeed
          posts={forYouFeedPosts}
          emptyFromFallback={isBroadCommunityFeed}
          openPostingsByLabId={forYouOpenPostingsByLabId}
        />
      </div>
    </div>
  );
}
