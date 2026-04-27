import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../_lib";

type ApplicantRow = {
  id: string;
  student_id: string;
  posting_id: string;
  status: string;
  created_at: string;
  role_postings: {
    id: string;
    title: string;
  } | null;
};

const statuses = ["submitted", "reviewing", "interview", "accepted", "rejected"];

export default async function LabApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { labId } = await params;
  const query = await searchParams;
  await getLabContext(labId);
  const supabase = await createClient();

  const requestedStatus = statuses.includes(query.status ?? "") ? query.status : "all";

  let request = supabase
    .from("applications")
    .select("id,student_id,posting_id,status,created_at,role_postings!inner(id,title,lab_id)")
    .eq("role_postings.lab_id", labId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestedStatus !== "all") {
    request = request.eq("status", requestedStatus);
  }

  const { data: applicants } = await request.returns<ApplicantRow[]>();
  const studentIds = (applicants ?? []).map((row) => row.student_id);

  const [{ data: studentProfiles }, { data: profiles }] =
    studentIds.length === 0
      ? [
          { data: [] as Array<{ id: string; full_name: string | null; year: string | null; major: string[] | null }> },
          { data: [] as Array<{ id: string; email: string; display_name: string | null }> },
        ]
      : await Promise.all([
          supabase.from("student_profiles").select("id,full_name,year,major").in("id", studentIds),
          supabase.from("profiles").select("id,email,display_name").in("id", studentIds),
        ]);

  const profileById = new Map<string, { email: string; display_name: string | null }>();
  (profiles ?? []).forEach((profile) => profileById.set(profile.id, profile));
  const studentById = new Map<string, { full_name: string | null; year: string | null; major: string[] | null }>();
  (studentProfiles ?? []).forEach((profile) => studentById.set(profile.id, profile));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-ll-navy">Applicants</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {["all", ...statuses].map((status) => (
          <a
            key={status}
            href={`/labs/${labId}/applicants?status=${status}`}
            className={`rounded-full border px-3 py-1 text-sm font-medium uppercase ${
              requestedStatus === status
                ? "border-ll-navy bg-ll-navy text-white"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {status}
          </a>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-base">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2 pr-4 font-medium">Applicant</th>
              <th className="py-2 pr-4 font-medium">Posting</th>
              <th className="py-2 pr-4 font-medium">Year / major</th>
              <th className="py-2 pr-4 font-medium">Applied</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(applicants ?? []).map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-ll-navy">
                    {studentById.get(row.student_id)?.full_name ??
                      profileById.get(row.student_id)?.display_name ??
                      profileById.get(row.student_id)?.email ??
                      "Unknown student"}
                  </p>
                </td>
                <td className="py-3 pr-4 text-zinc-700">{row.role_postings?.title ?? "Posting removed"}</td>
                <td className="py-3 pr-4 text-zinc-600">
                  {studentById.get(row.student_id)?.year ?? "—"} /{" "}
                  {studentById.get(row.student_id)?.major?.join(", ") ?? "—"}
                </td>
                <td className="py-3 pr-4 text-zinc-600">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-sm uppercase text-zinc-700">
                    {row.status}
                  </span>
                </td>
                <td className="py-3">
                  {row.role_postings?.id ? (
                    <Link
                      href={`/labs/${labId}/postings/${row.role_postings.id}/applicants`}
                      className="text-sm font-medium text-ll-navy underline"
                    >
                      Open posting review
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
