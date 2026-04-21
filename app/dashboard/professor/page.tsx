import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type LabMembershipRow = {
  lab_role: string;
  lab_groups: {
    id: string;
    name: string;
    tagline: string | null;
    university: string;
  } | null;
};

type ActivityRow = {
  id: string;
  created_at: string;
  status: string;
  role_postings: {
    title: string;
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

  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select(
      "lab_role,lab_groups(id,name,tagline,university)",
    )
    .eq("user_id", user?.id ?? "")
    .eq("is_active", true)
    .returns<LabMembershipRow[]>();

  const { data: createdPostings } = await supabase
    .from("role_postings")
    .select("id")
    .eq("created_by", user?.id ?? "")
    .limit(50)
    .returns<Array<{ id: string }>>();

  const postingIds = (createdPostings ?? []).map((posting) => posting.id);

  const { data: recentApplications } =
    postingIds.length === 0
      ? { data: [] as ActivityRow[] }
      : await supabase
          .from("applications")
          .select("id,created_at,status,role_postings(title,lab_groups(name))")
          .in("posting_id", postingIds)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<ActivityRow[]>();

  const labs = memberships ?? [];
  const recentActivity = recentApplications ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <h1 className="text-3xl font-semibold text-ll-navy">Professor dashboard</h1>
      <p className="mt-2 text-sm text-ll-gray">
        Welcome {profile?.display_name ?? profile?.email ?? "professor"}.
      </p>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-ll-navy">Your labs</h2>
          <Link
            href="/labs/new"
            className="rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Create lab
          </Link>
        </div>

        {labs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <p className="text-sm text-ll-gray">
              No labs yet. Create your first lab to start posting opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {labs.map((membership) =>
              membership.lab_groups ? (
                <article
                  key={membership.lab_groups.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <p className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-700">
                    {membership.lab_role.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-ll-navy">{membership.lab_groups.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{membership.lab_groups.university}</p>
                  {membership.lab_groups.tagline ? (
                    <p className="mt-2 text-sm text-ll-gray">{membership.lab_groups.tagline}</p>
                  ) : null}
                  <Link
                    href={`/labs/${membership.lab_groups.id}`}
                    className="mt-4 inline-block text-sm font-medium text-ll-navy underline"
                  >
                    Manage lab
                  </Link>
                </article>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-ll-navy">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-ll-gray">No applications yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                <p className="font-medium text-ll-navy">
                  {activity.role_postings?.title ?? "Role posting"} at{" "}
                  {activity.role_postings?.lab_groups?.name ?? "your lab"}
                </p>
                <p className="mt-1 text-zinc-600">
                  Status: {activity.status} · {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
