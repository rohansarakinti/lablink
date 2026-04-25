import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "./_lib";

export default async function LabOverviewPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  const context = await getLabContext(labId);
  const supabase = await createClient();

  const [{ count: memberCount }, { count: openPostingCount }, { count: followersCount }, { count: appsCount }] =
    await Promise.all([
      supabase.from("lab_memberships").select("*", { count: "exact", head: true }).eq("lab_id", labId).eq("is_active", true),
      supabase.from("role_postings").select("*", { count: "exact", head: true }).eq("lab_id", labId).eq("status", "open"),
      supabase.from("lab_follows").select("*", { count: "exact", head: true }).eq("lab_id", labId),
      supabase
        .from("applications")
        .select("id,role_postings!inner(lab_id)", { count: "exact", head: true })
        .eq("role_postings.lab_id", labId)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

  const stats = [
    { label: "Total members", value: memberCount ?? 0, accent: "from-ll-navy/90 to-[#0a5c6a]" },
    { label: "Open postings", value: openPostingCount ?? 0, accent: "from-ll-navy to-ll-purple" },
    { label: "Applications this month", value: appsCount ?? 0, accent: "from-ll-purple to-ll-navy/70" },
    { label: "Followers", value: followersCount ?? 0, accent: "from-ll-bg to-ll-purple" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-5 shadow-md shadow-ll-navy/5 backdrop-blur-sm"
          >
            <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${stat.accent}`} aria-hidden />
            <p className="pl-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{stat.label}</p>
            <p className="mt-3 pl-2 text-3xl font-bold tracking-tight text-ll-navy">{stat.value}</p>
          </article>
        ))}
      </div>

      <article className="overflow-hidden rounded-3xl border border-ll-navy/10 bg-white/95 p-6 shadow-lg shadow-ll-navy/5 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-ll-navy to-ll-purple" aria-hidden />
            <h2 className="mt-3 text-xl font-semibold text-ll-navy md:text-2xl">Public profile preview</h2>
            <p className="mt-1 text-sm text-zinc-600">What students and visitors see on your lab&apos;s public page.</p>
          </div>
        </div>

        {context.lab.banner_url ? (
          <img src={context.lab.banner_url} alt="" className="mt-4 h-40 w-full rounded-xl object-cover md:h-48" />
        ) : null}

        {context.lab.tagline ? <p className="mt-4 text-sm font-medium text-zinc-700">{context.lab.tagline}</p> : null}
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
          {context.lab.description || "No lab description added yet."}
        </p>

        {context.lab.research_fields.length > 0 || context.lab.research_tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {context.lab.research_fields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center rounded-full border border-ll-purple/20 bg-ll-bg px-2.5 py-0.5 text-xs font-medium text-ll-navy"
              >
                {field}
              </span>
            ))}
            {context.lab.research_tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-ll-purple/25 bg-ll-purple/10 px-2.5 py-0.5 text-xs font-medium text-ll-navy"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {context.lab.gallery_urls.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            {context.lab.gallery_urls.slice(0, 8).map((url) => (
              <img key={url} src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
            ))}
          </div>
        ) : null}

        {context.lab.student_fit || context.lab.expectations ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Who should apply</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {context.lab.student_fit || "Add guidance for student fit in Public profile."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expectations</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {context.lab.expectations || "Add weekly expectations in Public profile."}
              </p>
            </div>
          </div>
        ) : null}

        {context.lab.website_url ? (
          <a
            className="mt-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-ll-navy to-[#0a5c6a] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            href={context.lab.website_url}
          >
            Visit lab website <span aria-hidden>↗</span>
          </a>
        ) : null}
      </article>
    </div>
  );
}
