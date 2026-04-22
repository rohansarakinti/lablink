import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitApplication } from "./actions";

type CustomQuestion = {
  id: string;
  prompt: string;
  required?: boolean;
};

const evalMethodLabels: Record<string, string> = {
  resume: "Resume",
  transcript: "Transcript",
  statement_of_interest: "Statement of interest",
  short_response: "Short response questions",
  interview: "Interview",
};

export default async function PostingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: profileGate } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profileGate || profileGate.role !== "student") {
    redirect("/dashboard/professor");
  }

  if (!profileGate.onboarding_complete) {
    redirect("/onboarding/student");
  }

  const { data: posting } = await supabase
    .from("role_postings")
    .select(
      "id,lab_id,title,description,status,is_paid,hours_per_week,duration,start_date,application_deadline,required_skills,preferred_skills,eval_methods,custom_questions,lab_groups(name,university)",
    )
    .eq("id", id)
    .eq("status", "open")
    .maybeSingle<{
      id: string;
      lab_id: string;
      title: string;
      description: string | null;
      status: string;
      is_paid: string | null;
      hours_per_week: string | null;
      duration: string | null;
      start_date: string | null;
      application_deadline: string | null;
      required_skills: string[] | null;
      preferred_skills: string[] | null;
      eval_methods: string[] | null;
      custom_questions: CustomQuestion[] | null;
      lab_groups: { name: string; university: string } | null;
    }>();

  if (!posting) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <p className="text-sm text-zinc-600">Posting not found or no longer open.</p>
        <Link href="/dashboard/student" className="mt-3 inline-block text-sm text-ll-navy underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("resume_url,transcript_url")
    .eq("id", user.id)
    .maybeSingle<{ resume_url: string | null; transcript_url: string | null }>();

  const { data: existingApplication } = await supabase
    .from("applications")
    .select("id,status,created_at")
    .eq("posting_id", id)
    .eq("student_id", user.id)
    .maybeSingle<{ id: string; status: string; created_at: string }>();

  const evalMethods = posting.eval_methods ?? [];
  const showStatement =
    evalMethods.includes("statement_of_interest") || evalMethods.includes("short_response");
  const customQuestions = Array.isArray(posting.custom_questions) ? posting.custom_questions : [];

  const errorText =
    query.error === "resume_required"
      ? "Resume is required. Upload one or provide a resume URL."
      : query.error === "submit_failed"
        ? `Application submission failed: ${query.detail ?? "unknown error"}`
        : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <Link href="/dashboard/student" className="text-sm text-ll-navy underline">
        ← Back to dashboard
      </Link>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {posting.lab_groups?.name ?? "Lab"} · {posting.lab_groups?.university ?? "University"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ll-navy">{posting.title}</h1>
        <p className="mt-3 text-sm text-zinc-700">{posting.description ?? "No description provided yet."}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-1">{posting.is_paid ?? "pay unspecified"}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-1">{posting.hours_per_week ?? "hours tbd"}</span>
          {posting.application_deadline ? (
            <span className="rounded-full bg-zinc-100 px-2 py-1">
              deadline: {new Date(posting.application_deadline).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </section>

      {existingApplication ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold text-ll-navy">Application already submitted</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Status: {existingApplication.status} · Submitted{" "}
            {new Date(existingApplication.created_at).toLocaleDateString()}
          </p>
          <Link href="/dashboard/student/applications" className="mt-3 inline-block text-sm text-ll-navy underline">
            View in applications tab
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-ll-navy">Apply</h2>
          {errorText ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorText}
            </div>
          ) : null}

          <form action={submitApplication} className="mt-4 space-y-4">
            <input type="hidden" name="posting_id" value={posting.id} />

            <Field
              label="Resume URL"
              name="resume_url"
              defaultValue={studentProfile?.resume_url ?? ""}
              hint="Required unless you upload a resume file below."
            />
            <FileField label="Resume file (PDF)" name="resume_file" />

            <Field
              label="Transcript URL"
              name="transcript_url"
              defaultValue={studentProfile?.transcript_url ?? ""}
              hint="Optional."
            />
            <FileField label="Transcript file (PDF)" name="transcript_file" />

            {showStatement ? (
              <div className="space-y-2">
                <label htmlFor="statement" className="text-sm font-medium text-ll-navy">
                  Statement of interest
                </label>
                <textarea
                  id="statement"
                  name="statement"
                  rows={5}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Why are you a strong fit for this role?"
                />
              </div>
            ) : null}

            <CustomResponsesField questions={customQuestions} />

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Evaluation methods</p>
              <p className="mt-2 text-sm text-zinc-700">
                {(evalMethods.length ? evalMethods : ["resume"])
                  .map((method) => evalMethodLabels[method] ?? method)
                  .join(" · ")}
              </p>
            </div>

            <button
              type="submit"
              className="rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Submit application
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-ll-navy">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-ll-navy">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept=".pdf"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function CustomResponsesField({ questions }: { questions: CustomQuestion[] }) {
  if (!questions.length) {
    return null;
  }

  const normalized = questions
    .filter((question) => question.id && question.prompt)
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      required: question.required ?? false,
    }));

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ll-navy">Custom questions</p>
      {normalized.map((question) => (
        <div key={question.id} className="space-y-2">
          <label htmlFor={`question-${question.id}`} className="text-sm text-zinc-700">
            {question.prompt}
          </label>
          <textarea
            id={`question-${question.id}`}
            name={`custom_question_${question.id}`}
            rows={3}
            required={question.required}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      ))}
    </div>
  );
}
