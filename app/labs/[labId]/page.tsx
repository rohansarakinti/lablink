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
    { label: "Total members", value: memberCount ?? 0 },
    { label: "Open postings", value: openPostingCount ?? 0 },
    { label: "Applications this month", value: appsCount ?? 0 },
    { label: "Followers", value: followersCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ll-navy">{stat.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-ll-navy">Public profile preview</h2>

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
                className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700"
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
          <a className="mt-4 inline-block text-sm font-semibold text-ll-navy underline" href={context.lab.website_url}>
            Visit lab website
          </a>
        ) : null}
      </article>
    </div>
  );
}
