import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../../../../_lib";
import { ReviewTable } from "./review-table";

type ApplicationRow = {
  id: string;
  posting_id: string;
  student_id: string;
  status: string;
  created_at: string;
  statement: string | null;
  reviewer_notes: string | null;
  resume_url: string | null;
  transcript_url: string | null;
};

const statusOptions = ["submitted", "reviewing", "interview", "accepted", "rejected"];

export default async function PostingApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string; postingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { labId, postingId } = await params;
  const query = await searchParams;
  await getLabContext(labId);
  const supabase = await createClient();

  const { data: posting } = await supabase
    .from("role_postings")
    .select("id,title,lab_id")
    .eq("id", postingId)
    .eq("lab_id", labId)
    .maybeSingle<{ id: string; title: string; lab_id: string }>();

  if (!posting) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-600">Posting not found.</p>
      </div>
    );
  }

  const requestedStatus = statusOptions.includes(query.status ?? "") ? query.status : "all";
  let request = supabase
    .from("applications")
    .select("id,posting_id,student_id,status,created_at,statement,reviewer_notes,resume_url,transcript_url")
    .eq("posting_id", postingId)
    .order("created_at", { ascending: false });

  if (requestedStatus !== "all") {
    request = request.eq("status", requestedStatus);
  }

  const { data: applications } = await request.returns<ApplicationRow[]>();
  const studentIds = (applications ?? []).map((item) => item.student_id);

  const [{ data: studentProfiles }, { data: profiles }] =
    studentIds.length === 0
      ? [
          { data: [] as Array<{ id: string; full_name: string | null; year: string | null; major: string[] | null; gpa: number | null }> },
          { data: [] as Array<{ id: string; display_name: string | null; email: string }> },
        ]
      : await Promise.all([
          supabase.from("student_profiles").select("id,full_name,year,major,gpa").in("id", studentIds),
          supabase.from("profiles").select("id,display_name,email").in("id", studentIds),
        ]);

  const studentById = new Map<string, { full_name: string | null; year: string | null; major: string[] | null; gpa: number | null }>();
  (studentProfiles ?? []).forEach((student) => studentById.set(student.id, student));
  const profileById = new Map<string, { display_name: string | null; email: string }>();
  (profiles ?? []).forEach((profile) => profileById.set(profile.id, profile));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Applicant review</p>
        <h2 className="mt-1 text-2xl font-semibold text-ll-navy">{posting.title}</h2>
        <Link href={`/labs/${labId}/postings`} className="mt-2 inline-block text-sm text-ll-navy underline">
          Back to postings
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {["all", ...statusOptions].map((status) => (
            <a
              key={status}
              href={`/labs/${labId}/postings/${postingId}/applicants?status=${status}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                requestedStatus === status
                  ? "border-ll-navy bg-ll-navy text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {status}
            </a>
          ))}
        </div>
        <ReviewTable
          labId={labId}
          postingId={postingId}
          statusOptions={statusOptions}
          rows={(applications ?? []).map((application) => {
            const student = studentById.get(application.student_id);
            const profile = profileById.get(application.student_id);
            return {
              id: application.id,
              studentName:
                student?.full_name ?? profile?.display_name ?? profile?.email ?? "Unknown student",
              yearText: student?.year ?? "—",
              majorText: student?.major?.join(", ") ?? "—",
              gpaText: student?.gpa != null ? String(student.gpa) : "—",
              appliedDateText: new Date(application.created_at).toLocaleDateString(),
              statement: application.statement,
              reviewerNotes: application.reviewer_notes,
              resumeUrl: application.resume_url,
              transcriptUrl: application.transcript_url,
              status: application.status,
            };
          })}
        />
      </div>
    </div>
  );
}
