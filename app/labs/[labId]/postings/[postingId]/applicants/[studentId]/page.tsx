import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../../../../_lib";
import { StudentProfileEditor, type StudentProfileValues } from "@/app/dashboard/student/profile/student-profile-editor";

export default async function ApplicantStudentProfilePage({
  params,
}: {
  params: Promise<{ labId: string; postingId: string; studentId: string }>;
}) {
  const { labId, postingId, studentId } = await params;
  await getLabContext(labId);
  const supabase = await createClient();

  const { data: posting } = await supabase
    .from("role_postings")
    .select("id,title,lab_id")
    .eq("id", postingId)
    .eq("lab_id", labId)
    .maybeSingle<{ id: string; title: string; lab_id: string }>();

  if (!posting) notFound();

  const { data: application } = await supabase
    .from("applications")
    .select("id,status,created_at,statement,resume_url,transcript_url,reviewer_notes,custom_responses")
    .eq("posting_id", postingId)
    .eq("student_id", studentId)
    .maybeSingle<{
      id: string;
      status: string;
      created_at: string;
      statement: string | null;
      resume_url: string | null;
      transcript_url: string | null;
      reviewer_notes: string | null;
      custom_responses: Record<string, string> | null;
    }>();

  if (!application) notFound();

  const [{ data: profile }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,email,avatar_url")
      .eq("id", studentId)
      .maybeSingle<{ id: string; display_name: string | null; email: string | null; avatar_url: string | null }>(),
    supabase
      .from("student_profiles")
      .select(
        "full_name,university,year,graduation_month,graduation_year,gpa,is_gpa_visible,research_fields,research_topics,ranked_interests,skills,programming_languages,lab_equipment,software_tools,prior_experience,experience_details,resume_url,transcript_url,relevant_courses,honors_or_awards,publications,role_types_sought,time_commitment,paid_preference,experience_types,motivations,priorities,start_availability,willing_to_volunteer,major,minor",
      )
      .eq("id", studentId)
      .maybeSingle<{
        full_name: string | null;
        university: string | null;
        year: string | null;
        graduation_month: number | null;
        graduation_year: number | null;
        gpa: number | null;
        is_gpa_visible: boolean;
        research_fields: string[] | null;
        research_topics: string[] | null;
        ranked_interests: string[] | null;
        skills: string[] | null;
        programming_languages: string[] | null;
        lab_equipment: string[] | null;
        software_tools: string[] | null;
        prior_experience: string[] | null;
        experience_details: string | null;
        resume_url: string | null;
        transcript_url: string | null;
        relevant_courses: string[] | null;
        honors_or_awards: string | null;
        publications: string | null;
        role_types_sought: string[] | null;
        time_commitment: string | null;
        paid_preference: string | null;
        experience_types: string[] | null;
        motivations: string[] | null;
        priorities: string[] | null;
        start_availability: string | null;
        willing_to_volunteer: boolean;
        major: string[] | null;
        minor: string[] | null;
      }>(),
  ]);

  const studentName = student?.full_name ?? profile?.display_name ?? profile?.email ?? "Student";
  const values: StudentProfileValues = {
    display_name: profile?.display_name ?? "",
    email: profile?.email ?? "",
    avatar_url: profile?.avatar_url ?? "",
    full_name: student?.full_name ?? profile?.display_name ?? "",
    university: student?.university ?? "",
    major: (student?.major ?? []).join(", "),
    minor: (student?.minor ?? []).join(", "),
    year: student?.year ?? "",
    graduation_month: student?.graduation_month != null ? String(student.graduation_month) : "",
    graduation_year: student?.graduation_year != null ? String(student.graduation_year) : "",
    gpa: student?.gpa != null ? String(student.gpa) : "",
    is_gpa_visible: String(student?.is_gpa_visible ?? true),
    willing_to_volunteer: String(student?.willing_to_volunteer ?? true),
    research_fields: (student?.research_fields ?? []).join(", "),
    research_topics: (student?.research_topics ?? []).join(", "),
    ranked_interests: (student?.ranked_interests ?? []).join(", "),
    skills: (student?.skills ?? []).join(", "),
    programming_languages: (student?.programming_languages ?? []).join(", "),
    lab_equipment: (student?.lab_equipment ?? []).join(", "),
    software_tools: (student?.software_tools ?? []).join(", "),
    prior_experience: (student?.prior_experience ?? []).join(", "),
    experience_details: student?.experience_details ?? "",
    relevant_courses: (student?.relevant_courses ?? []).join(", "),
    role_types_sought: (student?.role_types_sought ?? []).join(", "),
    experience_types: (student?.experience_types ?? []).join(", "),
    priorities: (student?.priorities ?? []).join(", "),
    motivations: (student?.motivations ?? []).join(", "),
    time_commitment: student?.time_commitment ?? "",
    paid_preference: student?.paid_preference ?? "",
    start_availability: student?.start_availability ?? "",
    honors_or_awards: student?.honors_or_awards ?? "",
    publications: student?.publications ?? "",
    resume_url: application.resume_url ?? student?.resume_url ?? "",
    transcript_url: application.transcript_url ?? student?.transcript_url ?? "",
  };
  const customResponses = Object.entries(application.custom_responses ?? {});

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <Link
          href={`/labs/${labId}/postings/${postingId}/applicants`}
          className="text-sm text-ll-navy underline"
        >
          ← Back to applicant review
        </Link>
        <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">Applicant profile</p>
        <h2 className="mt-1 text-2xl font-semibold text-ll-navy">{studentName}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {posting.title} · Applied {new Date(application.created_at).toLocaleDateString()} · Status:{" "}
          <span className="font-medium text-zinc-800">{application.status}</span>
        </p>
      </div>

      <StudentProfileEditor values={values} saved={false} readOnly />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-ll-navy">Application-specific responses</h3>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          <p>Statement: {application.statement || "—"}</p>
          <p>Reviewer notes: {application.reviewer_notes || "—"}</p>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Custom responses</h4>
          {customResponses.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No custom question responses submitted.</p>
          ) : (
            <div className="mt-2 space-y-3">
              {customResponses.map(([questionId, answer]) => (
                <div key={questionId} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Question {questionId}</p>
                  <p className="mt-1 text-sm text-zinc-700">{answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
