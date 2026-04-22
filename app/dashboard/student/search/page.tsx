import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rankRolePostingsForSearchQuery } from "@/lib/matching";
import { StudentSearchBrowser, type StudentSearchResult } from "@/components/student/student-search-browser";

type Row = {
  id: string;
  title: string;
  description: string | null;
  is_paid: string | null;
  hours_per_week: string | null;
  application_deadline: string | null;
  min_gpa: number | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  preferred_year: string[] | null;
  lab_groups: {
    name: string;
    university: string;
    department: string | null;
    research_fields: string[] | null;
    research_tags: string[] | null;
    lab_environment: string[] | null;
    banner_url: string | null;
    logo_url: string | null;
    created_by: string;
  } | null;
};

export default async function StudentSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = (q || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  if (!query) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-ll-navy">Search roles</h1>
        <p className="mt-2 text-sm text-zinc-600">Enter a search in the bar above, then press Enter to find open postings.</p>
        <p className="mt-3 text-xs text-zinc-500">We use the same vector similarity plus LLM re-ranking as your personalized matches.</p>
      </div>
    );
  }

  const { matches: ranked, error: searchFailure } = await rankRolePostingsForSearchQuery(user.id, query);

  if (ranked.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ll-navy">No matches yet</h1>
        {searchFailure ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900">{searchFailure}</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            Nothing turned up for &quot;{query}&quot;. Try different keywords, or make sure role postings have embeddings
            (open listings after embeddings are generated).
          </p>
        )}
      </div>
    );
  }

  const order = ranked.map((r) => r.posting_id);
  const meta = new Map(ranked.map((r) => [r.posting_id, r]));

  const { data: rows } = await supabase
    .from("role_postings")
    .select(
      "id, title, description, is_paid, hours_per_week, application_deadline, min_gpa, required_skills, preferred_skills, preferred_year, lab_groups ( name, university, department, research_fields, research_tags, lab_environment, banner_url, logo_url, created_by )",
    )
    .in("id", order)
    .returns<Row[]>();

  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const creatorIds = [
    ...new Set((rows ?? []).map((r) => r.lab_groups?.created_by).filter((id): id is string => Boolean(id))),
  ];
  const { data: profs } =
    creatorIds.length === 0
      ? { data: [] as { id: string; display_name: string | null }[] }
      : await supabase.from("profiles").select("id, display_name").in("id", creatorIds);

  const piName = new Map((profs ?? []).map((p) => [p.id, p.display_name?.trim() || "Principal investigator"]));

  const items: StudentSearchResult[] = order
    .map((id) => {
      const r = byId.get(id);
      const m = meta.get(id);
      if (!r || !m) return null;
      const lab = r.lab_groups;
      const createdBy = lab?.created_by;
      const topic =
        (lab?.research_fields && lab.research_fields[0]) ||
        (lab?.research_tags && lab.research_tags[0]) ||
        "Research";
      return {
        postingId: r.id,
        vectorScore: m.vector_score,
        reason: m.reason,
        title: r.title,
        labName: lab?.name ?? "Lab",
        university: lab?.university ?? "",
        department: lab?.department ?? null,
        topic: String(topic).toUpperCase(),
        description: r.description,
        requiredSkills: r.required_skills ?? [],
        preferredSkills: r.preferred_skills ?? [],
        isPaid: r.is_paid,
        hoursPerWeek: r.hours_per_week,
        applicationDeadline: r.application_deadline,
        minGpa: r.min_gpa,
        preferredYear: r.preferred_year ?? [],
        piName: (createdBy && piName.get(createdBy)) || "Principal investigator",
        labEnvironment: lab?.lab_environment ?? [],
        researchFields: lab?.research_fields ?? [],
        bannerUrl: lab?.banner_url ?? null,
        labLogoUrl: lab?.logo_url ?? null,
      } satisfies StudentSearchResult;
    })
    .filter((x): x is StudentSearchResult => x != null);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ll-navy md:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Showing {items.length} result{items.length === 1 ? "" : "s"} for &quot;{query}&quot;
        </p>
      </header>
      <StudentSearchBrowser items={items} query={query} />
    </div>
  );
}
