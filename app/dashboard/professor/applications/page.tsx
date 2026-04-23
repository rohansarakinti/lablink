import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  student_id: string;
  role_postings: {
    id: string;
    title: string;
    lab_groups: { id: string; name: string } | null;
  } | null;
};

export default async function ProfessorApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: createdPostings } = await supabase
    .from("role_postings")
    .select("id")
    .eq("created_by", user?.id ?? "")
    .limit(200)
    .returns<Array<{ id: string }>>();

  const postingIds = (createdPostings ?? []).map((p) => p.id);

  const { data: rows } =
    postingIds.length === 0
      ? { data: [] as ApplicationRow[] }
      : await supabase
          .from("applications")
          .select("id,created_at,status,student_id,role_postings(id,title,lab_groups(id,name))")
          .in("posting_id", postingIds)
          .order("created_at", { ascending: false })
          .limit(200)
          .returns<ApplicationRow[]>();

  const applications = rows ?? [];

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-ll-navy md:text-4xl">Applications</h1>
        <p className="mt-2 text-sm text-ll-gray">
          Applications to postings you created. Open a lab posting to review applicants in detail.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-ll-gray">
          No applications yet. When students apply to your postings, they will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Posting</th>
                <th className="px-4 py-3">Lab</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {applications.map((app) => {
                const labId = app.role_postings?.lab_groups?.id;
                const postingId = app.role_postings?.id;
                const reviewHref =
                  labId && postingId
                    ? `/labs/${labId}/postings/${postingId}/applicants`
                    : null;
                return (
                  <tr key={app.id} className="text-zinc-800">
                    <td className="px-4 py-3 font-medium text-ll-navy">
                      {app.role_postings?.title ?? "Posting"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{app.role_postings?.lab_groups?.name ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{app.status}</td>
                    <td className="px-4 py-3 text-zinc-600">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {reviewHref ? (
                        <Link href={reviewHref} className="font-medium text-ll-navy underline">
                          Applicants
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
