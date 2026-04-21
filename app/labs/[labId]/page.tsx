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
        {context.lab.tagline ? <p className="mt-2 text-sm font-medium text-zinc-700">{context.lab.tagline}</p> : null}
        <p className="mt-3 text-sm text-zinc-600">{context.lab.description || "No lab description added yet."}</p>
        {context.lab.website_url ? (
          <a className="mt-4 inline-block text-sm font-semibold text-ll-navy underline" href={context.lab.website_url}>
            Visit lab website
          </a>
        ) : null}
      </article>
    </div>
  );
}
