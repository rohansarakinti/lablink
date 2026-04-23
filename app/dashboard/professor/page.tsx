import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

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
    .select("lab_groups(id)")
    .eq("user_id", user?.id ?? "")
    .eq("is_active", true)
    .returns<Array<{ lab_groups: { id: string } | null }>>();

  const labCount = (memberships ?? []).filter((m) => m.lab_groups).length;

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

  const { count: applicationCount } =
    postingIds.length === 0
      ? { count: 0 }
      : await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("posting_id", postingIds);

  const recentActivity = recentApplications ?? [];
  const firstName = (profile?.display_name ?? profile?.email ?? "there").split(/\s+/)[0] ?? "there";

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 md:mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-ll-navy sm:text-5xl md:text-6xl">Welcome, {firstName}</h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-600 sm:text-lg">
          Your LabLink home for labs you run and applications on your postings.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">My labs</p>
          <p className="mt-1 text-2xl font-bold text-ll-navy">{labCount}</p>
          <Link href="/dashboard/professor/labs" className="mt-2 inline-block text-sm font-medium text-ll-navy underline">
            View labs
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Applications (your postings)</p>
          <p className="mt-1 text-2xl font-bold text-ll-navy">{applicationCount ?? 0}</p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-ll-navy">Recent activity</h2>
          <Link href="/dashboard/professor/labs" className="text-sm font-medium text-ll-navy underline">
            Manage labs
          </Link>
        </div>
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
    </div>
  );
}
