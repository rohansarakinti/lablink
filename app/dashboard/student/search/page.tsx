import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rankRolePostingsForSearchQuery } from "@/lib/matching";
import { StudentSearchBrowser, type StudentSearchResult } from "@/components/student/student-search-browser";
import { SearchFilterRow } from "@/components/student/search-filter-row";
import Link from "next/link";

type Row = {
  id: string;
  title: string;
  description: string | null;
  member_role: string;
  is_paid: string | null;
  hours_per_week: string | null;
  application_deadline: string | null;
  min_gpa: number | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  preferred_year: string[] | null;
  lab_groups: {
    id: string;
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

const FILTER_LABELS = {
  field: "Research field",
  role: "Role type",
  paid: "Paid/unpaid",
  hours: "Hours",
  year: "Year preference",
  university: "University",
} as const;

type FilterKey = keyof typeof FILTER_LABELS;

type FilterState = Record<FilterKey, string[]>;

function readFilterValues(
  value: string | string[] | undefined,
): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean))];
}

function titleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function roleLabel(role: string) {
  const pretty = titleCase(role).replace("Ra", "RA");
  if (pretty === "Grad Researcher") return "Graduate researcher";
  if (pretty === "Lab Technician") return "Lab technician";
  return pretty;
}

function hasOverlap(haystack: string[], needles: string[]) {
  if (needles.length === 0) return true;
  const set = new Set(haystack.map((item) => item.toLowerCase()));
  return needles.some((needle) => set.has(needle.toLowerCase()));
}

function uniqueNormalized(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
  }
  return out;
}

export default async function StudentSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim();
  const filters: FilterState = {
    field: readFilterValues(params.field),
    role: readFilterValues(params.role),
    paid: readFilterValues(params.paid),
    hours: readFilterValues(params.hours),
    year: readFilterValues(params.year),
    university: readFilterValues(params.university),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  if (!query) {
    return (
      <div className="ll-animate-scale-in mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-ll-navy">Search roles</h1>
        <p className="mt-2 text-sm text-zinc-600">Enter a search in the bar above, then press Enter to find open postings.</p>
        <p className="mt-3 text-xs text-zinc-500">We use the same vector similarity plus LLM re-ranking as your personalized matches.</p>
      </div>
    );
  }

  const { matches: ranked, error: searchFailure } = await rankRolePostingsForSearchQuery(user.id, query);

  if (ranked.length === 0) {
    return (
      <div className="ll-animate-fade-up">
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
      "id, title, description, member_role, is_paid, hours_per_week, application_deadline, min_gpa, required_skills, preferred_skills, preferred_year, lab_groups ( id, name, university, department, research_fields, research_tags, lab_environment, banner_url, logo_url, created_by )",
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
  const rowById = new Map((rows ?? []).map((row) => [row.id, row]));

  const options = {
    field: uniqueNormalized((rows ?? []).flatMap((row) => row.lab_groups?.research_fields ?? [])).sort((a, b) =>
      a.localeCompare(b),
    ),
    role: uniqueNormalized((rows ?? []).map((row) => row.member_role)).sort((a, b) => a.localeCompare(b)),
    paid: uniqueNormalized((rows ?? []).map((row) => row.is_paid)).sort((a, b) => a.localeCompare(b)),
    hours: uniqueNormalized((rows ?? []).map((row) => row.hours_per_week)),
    year: uniqueNormalized((rows ?? []).flatMap((row) => row.preferred_year ?? [])).sort((a, b) => a.localeCompare(b)),
    university: uniqueNormalized((rows ?? []).map((row) => row.lab_groups?.university)).sort((a, b) =>
      a.localeCompare(b),
    ),
  } satisfies FilterState;

  const filteredOrder = order.filter((id) => {
    const row = rowById.get(id);
    if (!row) return false;
    return (
      hasOverlap(row.lab_groups?.research_fields ?? [], filters.field) &&
      hasOverlap([row.member_role], filters.role) &&
      hasOverlap([row.is_paid ?? ""], filters.paid) &&
      hasOverlap([row.hours_per_week ?? ""], filters.hours) &&
      hasOverlap(row.preferred_year ?? [], filters.year) &&
      hasOverlap([row.lab_groups?.university ?? ""], filters.university)
    );
  });

  const filterSections = (Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => ({
    key,
    label: FILTER_LABELS[key],
    options: options[key].map((value) => ({
      value,
      label: key === "role" ? roleLabel(value) : key === "year" ? titleCase(value) : value,
    })),
  }));

  const items = filteredOrder
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
        labId: lab?.id ?? "",
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
        applicantCount: null as number | null,
      } satisfies StudentSearchResult;
    })
    .filter((x): x is StudentSearchResult => x != null);

  const clearAllHref = `/dashboard/student/search?q=${encodeURIComponent(query)}`;

  return (
    <div className="ll-animate-fade-up">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ll-navy md:text-3xl">Search</h1>
        <p className="ll-animate-fade-up ll-delay-100 mt-1 text-sm text-zinc-600">
          Showing {items.length} result{items.length === 1 ? "" : "s"} for &quot;{query}&quot;
        </p>
      </header>
      <SearchFilterRow query={query} selected={filters} sections={filterSections} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-10 text-center">
          <p className="text-sm text-zinc-600">No opportunities match the current filter selection.</p>
          <Link href={clearAllHref} className="mt-3 inline-block text-sm font-medium text-ll-navy hover:underline">
            Reset filters
          </Link>
        </div>
      ) : null}
      {items.length > 0 ? <StudentSearchBrowser items={items} query={query} /> : null}
    </div>
  );
}
