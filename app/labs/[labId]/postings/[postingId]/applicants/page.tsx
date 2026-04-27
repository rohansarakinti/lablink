import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../../../_lib";
import { ReviewTable } from "./review-table";
import { rankStudentsForPosting } from "@/lib/posting-student-matching";

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
const viewOptions = ["recommended", ...statusOptions] as const;

function includesItem(values: string[] | null | undefined, selected: string | undefined) {
  if (!selected || !String(selected).trim()) return true;
  const want = String(selected).trim().toLowerCase();
  return (values ?? []).some((item) => item.toLowerCase() === want);
}

function uniqueFromApplicantProfiles(
  rows: Array<{
    skills: string[] | null;
    research_fields: string[] | null;
    major: string[] | null;
    prior_experience: string[] | null;
    paid_preference: string | null;
  }>,
) {
  const addAll = (set: Set<string>, arr: string[] | null | undefined) => {
    for (const item of arr ?? []) {
      if (item?.trim()) set.add(item.trim());
    }
  };
  const skills = new Set<string>();
  const researchFields = new Set<string>();
  const majors = new Set<string>();
  const prior = new Set<string>();
  const paid = new Set<string>();
  for (const row of rows) {
    addAll(skills, row.skills);
    addAll(researchFields, row.research_fields);
    addAll(majors, row.major);
    addAll(prior, row.prior_experience);
    if (row.paid_preference?.trim()) paid.add(row.paid_preference.trim());
  }
  return {
    skills: Array.from(skills).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    researchFields: Array.from(researchFields).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    majors: Array.from(majors).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    priorExperience: Array.from(prior).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    paidPreferences: Array.from(paid).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  };
}

const YEAR_OPTIONS = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "graduate", label: "Graduate" },
  { value: "other", label: "Other" },
];

const PRIOR_EXPERIENCE_KNOWN = [
  { value: "none", label: "No prior experience" },
  { value: "research_lab", label: "Research lab" },
  { value: "hospital_volunteering", label: "Hospital volunteering" },
  { value: "shadowing", label: "Physician shadowing" },
  { value: "clinical_work", label: "Clinical work" },
  { value: "independent_project", label: "Independent project" },
];

const PAID_PREFERENCE_OPTIONS = [
  { value: "paid_only", label: "Paid only" },
  { value: "open_to_unpaid", label: "Open to unpaid" },
  { value: "either", label: "Either paid or unpaid" },
];

const MIN_GPA_OPTIONS = ["2.0", "2.5", "2.7", "3.0", "3.3", "3.5", "3.7", "4.0"];

export default async function PostingApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string; postingId: string }>;
  searchParams: Promise<{
    status?: string;
    skills?: string;
    research_fields?: string;
    year?: string;
    major?: string;
    min_gpa?: string;
    prior_experience?: string;
    willing_to_volunteer?: string;
    paid_preference?: string;
  }>;
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
      <div className="rounded-3xl border border-ll-purple/25 bg-ll-bg/70 p-8 text-center shadow-md">
        <p className="text-sm font-medium text-ll-navy">Posting not found.</p>
      </div>
    );
  }

  const requestedStatus = viewOptions.includes((query.status ?? "recommended") as (typeof viewOptions)[number])
    ? query.status ?? "recommended"
    : "recommended";
  let request = supabase
    .from("applications")
    .select("id,posting_id,student_id,status,created_at,statement,reviewer_notes,resume_url,transcript_url")
    .eq("posting_id", postingId)
    .order("created_at", { ascending: false });

  if (requestedStatus !== "recommended") {
    request = request.eq("status", requestedStatus);
  }

  const { data: applications } = await request.returns<ApplicationRow[]>();
  const studentIds = (applications ?? []).map((item) => item.student_id);

  const [{ data: studentProfiles }, { data: profiles }] =
    studentIds.length === 0
      ? [
          {
            data: [] as Array<{
              id: string;
              full_name: string | null;
              year: string | null;
              major: string[] | null;
              gpa: number | null;
              skills: string[] | null;
              research_fields: string[] | null;
              prior_experience: string[] | null;
              willing_to_volunteer: boolean;
              paid_preference: string | null;
            }>,
          },
          { data: [] as Array<{ id: string; display_name: string | null; email: string }> },
        ]
      : await Promise.all([
          supabase
            .from("student_profiles")
            .select(
              "id,full_name,year,major,gpa,skills,research_fields,prior_experience,willing_to_volunteer,paid_preference",
            )
            .in("id", studentIds),
          supabase.from("profiles").select("id,display_name,email").in("id", studentIds),
        ]);

  const studentById = new Map<
    string,
    {
      full_name: string | null;
      year: string | null;
      major: string[] | null;
      gpa: number | null;
      skills: string[] | null;
      research_fields: string[] | null;
      prior_experience: string[] | null;
      willing_to_volunteer: boolean;
      paid_preference: string | null;
    }
  >();
  (studentProfiles ?? []).forEach((student) => studentById.set(student.id, student));
  const profileById = new Map<string, { display_name: string | null; email: string }>();
  (profiles ?? []).forEach((profile) => profileById.set(profile.id, profile));

  const filterOptionLists = uniqueFromApplicantProfiles(
    (studentProfiles ?? []).map((s) => ({
      skills: s.skills,
      research_fields: s.research_fields,
      major: s.major,
      prior_experience: s.prior_experience,
      paid_preference: s.paid_preference,
    })),
  );

  const filterSkill = String(query.skills ?? "").trim();
  const filterResearchField = String(query.research_fields ?? "").trim();
  const filterMajor = String(query.major ?? "").trim();
  const filterPrior = String(query.prior_experience ?? "").trim();
  const selectedYear = String(query.year ?? "").trim().toLowerCase();
  const minGpa = Number(query.min_gpa ?? "");
  const selectedVolunteer = String(query.willing_to_volunteer ?? "").trim().toLowerCase();
  const filterPaid = String(query.paid_preference ?? "").trim();

  const recommendationRankings =
    requestedStatus === "recommended" && studentIds.length > 0
      ? await rankStudentsForPosting(postingId, studentIds)
      : [];
  const recommendationByStudentId = new Map(
    recommendationRankings.map((item) => [item.student_id, item]),
  );

  const buildApplicantListUrl = (nextStatus: string) => {
    const p = new URLSearchParams();
    p.set("status", nextStatus);
    if (query.skills) p.set("skills", query.skills);
    if (query.research_fields) p.set("research_fields", query.research_fields);
    if (query.major) p.set("major", query.major);
    if (query.prior_experience) p.set("prior_experience", query.prior_experience);
    if (query.year) p.set("year", query.year);
    if (query.min_gpa) p.set("min_gpa", query.min_gpa);
    if (query.willing_to_volunteer) p.set("willing_to_volunteer", query.willing_to_volunteer);
    if (query.paid_preference) p.set("paid_preference", query.paid_preference);
    return `/labs/${labId}/postings/${postingId}/applicants?${p.toString()}`;
  };

  const filteredRows = (applications ?? [])
    .filter((application) => {
      // Show every application row even if student_profiles is missing; filters use optional data.
      const student = studentById.get(application.student_id);

      if (!includesItem(student?.skills, filterSkill)) return false;
      if (!includesItem(student?.research_fields, filterResearchField)) return false;
      if (!includesItem(student?.major, filterMajor)) return false;
      if (!includesItem(student?.prior_experience, filterPrior)) return false;

      if (selectedYear && String(student?.year ?? "").toLowerCase() !== selectedYear) return false;
      if (
        student &&
        !Number.isNaN(minGpa) &&
        minGpa > 0 &&
        (student.gpa ?? 0) < minGpa
      ) {
        return false;
      }
      if (
        student &&
        selectedVolunteer &&
        String(student.willing_to_volunteer).toLowerCase() !== selectedVolunteer
      ) {
        return false;
      }
      if (
        student &&
        filterPaid &&
        String(student.paid_preference ?? "").toLowerCase() !== filterPaid.toLowerCase()
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (requestedStatus !== "recommended") return 0;
      const rankA = recommendationByStudentId.get(a.student_id)?.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = recommendationByStudentId.get(b.student_id)?.rank ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-ll-purple/20 bg-white p-6 shadow-lg shadow-ll-navy/5 md:p-8">
        <div className="h-1 w-14 rounded-full bg-ll-purple" aria-hidden />
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-ll-navy/80">Applicant review</p>
        <h2 className="mt-2 text-2xl font-semibold text-ll-navy md:text-3xl">{posting.title}</h2>
        <Link
          href={`/labs/${labId}/postings`}
          className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-ll-purple/25 bg-white/90 px-3 py-1.5 text-base font-semibold text-ll-navy shadow-sm transition hover:border-ll-purple/40 hover:bg-ll-bg/60"
        >
          ← Back to postings
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-100 bg-white/95 p-6 shadow-md md:p-7">
        <div className="mb-5 flex flex-wrap gap-2">
          {viewOptions.map((status) => (
            <a
              key={status}
              href={buildApplicantListUrl(status)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-wide shadow-sm transition ${
                requestedStatus === status
                  ? "border-transparent bg-ll-navy text-white shadow-md shadow-ll-navy/20"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-ll-purple/25 hover:bg-ll-bg/50"
              }`}
            >
              {status}
            </a>
          ))}
        </div>
        <form
          method="get"
          className="mb-5 grid gap-2 rounded-2xl border border-ll-purple/20 bg-ll-bg/50 p-4 md:grid-cols-4"
        >
          <input type="hidden" name="status" value={requestedStatus} />
          <select
            name="skills"
            defaultValue={query.skills ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any skill</option>
            {filterOptionLists.skills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="research_fields"
            defaultValue={query.research_fields ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any research field</option>
            {filterOptionLists.researchFields.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="major"
            defaultValue={query.major ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any major</option>
            {filterOptionLists.majors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="prior_experience"
            defaultValue={query.prior_experience ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any prior experience</option>
            {PRIOR_EXPERIENCE_KNOWN.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {filterOptionLists.priorExperience
              .filter((p) => !PRIOR_EXPERIENCE_KNOWN.some((k) => k.value === p))
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
          <select
            name="year"
            defaultValue={query.year ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any year</option>
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="min_gpa"
            defaultValue={query.min_gpa ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any min GPA</option>
            {MIN_GPA_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}+
              </option>
            ))}
          </select>
          <select
            name="willing_to_volunteer"
            defaultValue={query.willing_to_volunteer ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Volunteer (any)</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <select
            name="paid_preference"
            defaultValue={query.paid_preference ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Any paid preference</option>
            {PAID_PREFERENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {filterOptionLists.paidPreferences
              .filter((p) => !PAID_PREFERENCE_OPTIONS.some((k) => k.value === p))
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button type="submit" className="rounded-full bg-ll-navy px-3 py-1 text-sm font-medium text-white">
              Apply filters
            </button>
            <a
              href={buildApplicantListUrl(requestedStatus)}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700"
            >
              Clear filters
            </a>
          </div>
        </form>
        <ReviewTable
          labId={labId}
          postingId={postingId}
          statusOptions={statusOptions}
          showRecommendation={requestedStatus === "recommended"}
          rows={filteredRows.map((application) => {
            const student = studentById.get(application.student_id);
            const profile = profileById.get(application.student_id);
            const recommendation = recommendationByStudentId.get(application.student_id);
            return {
              id: application.id,
              studentId: application.student_id,
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
              recommendationReason: recommendation?.reason ?? null,
              recommendationScore: recommendation?.vector_score ?? null,
            };
          })}
        />
      </div>
    </div>
  );
}
