"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export type RankedMatch = {
  posting_id: string;
  vector_score: number;
  rank: number;
  reason: string;
};

type CandidateRow = { posting_id: string; vector_score: number };

type StudentRow = Record<string, unknown>;

type PostingRow = {
  id: string;
  title: string;
  description: string | null;
  member_role: string;
  is_paid: string | null;
  hours_per_week: string | null;
  duration: string | null;
  start_date: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  preferred_year: string[] | null;
  preferred_majors: string[] | null;
  min_gpa: number | null;
  gpa_enforcement: string | null;
  priority_courses: string[] | null;
  lab_groups: {
    name: string;
    university: string;
    department: string | null;
    research_fields: string[] | null;
    research_tags: string[] | null;
    lab_environment: string[] | null;
  } | null;
};

export async function rankMatchesForStudent(studentId: string): Promise<RankedMatch[]> {
  const supabase = await createClient();

  const { data: candidates } = await supabase.rpc("vector_match_role_postings", {
    p_student_id: studentId,
    p_limit: 50,
  });

  if (!candidates || (candidates as CandidateRow[]).length === 0) {
    await supabase.from("match_cache").delete().eq("student_id", studentId);
    return [];
  }

  const list = candidates as CandidateRow[];
  const postingIds = list.map((c) => c.posting_id);
  const vectorScoreMap = Object.fromEntries(list.map((c) => [c.posting_id, c.vector_score]));

  const { data: student } = await supabase
    .from("student_profiles")
    .select(
      "year, major, research_fields, research_topics, skills, lab_equipment, programming_languages, prior_experience, experience_types, motivations, priorities, time_commitment, paid_preference",
    )
    .eq("id", studentId)
    .maybeSingle<StudentRow>();

  const { data: postings } = await supabase
    .from("role_postings")
    .select(
      `
      id, title, description, member_role, is_paid, hours_per_week, duration, start_date,
      required_skills, preferred_skills, preferred_year, preferred_majors,
      min_gpa, gpa_enforcement, priority_courses,
      lab_groups ( name, university, department, research_fields, research_tags, lab_environment )
    `,
    )
    .in("id", postingIds)
    .returns<PostingRow[]>();

  const postingById = new Map((postings ?? []).map((p) => [p.id, p]));
  const studentTerms = buildStudentTermSet(student);

  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  let ranked: RankedMatch[] | null = null;

  if (apiKey && student && postings && postings.length > 0) {
    try {
      const prompt = buildRankingPrompt(student, postings, list);
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = safeJsonParse<LlmRankItem[]>(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validIds = new Set(postingIds);
            const seen = new Set<string>();
            const rows = parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.posting_id === "string" &&
                  validIds.has(item.posting_id) &&
                  typeof item.rank === "number" &&
                  typeof item.reason === "string",
              )
              .filter((item) => {
                if (seen.has(item.posting_id)) return false;
                seen.add(item.posting_id);
                return true;
              })
              .sort((a, b) => a.rank - b.rank)
              .map((item, index) => ({
                posting_id: item.posting_id,
                vector_score: vectorScoreMap[item.posting_id] ?? 0,
                rank: index + 1,
                reason: item.reason.slice(0, 500),
              }));
            if (rows.length > 0) ranked = rows;
          }
        }
      }
    } catch {
      ranked = null;
    }
  }

  if (!ranked || ranked.length === 0) {
    ranked = heuristicRank(list, vectorScoreMap, studentTerms, postingById);
  }

  await supabase.from("match_cache").delete().eq("student_id", studentId);
  if (ranked.length > 0) {
    await supabase.from("match_cache").insert(
      ranked.map((item) => ({
        student_id: studentId,
        posting_id: item.posting_id,
        vector_score: item.vector_score,
        llm_rank: item.rank,
        llm_reason: item.reason,
        computed_at: new Date().toISOString(),
      })),
    );
  }

  return ranked;
}

type LlmRankItem = { posting_id: string; rank: number; reason: string };

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildStudentTermSet(student: StudentRow | null | undefined): Set<string> {
  const terms: string[] = [];
  if (student?.research_fields && Array.isArray(student.research_fields)) {
    terms.push(...(student.research_fields as string[]));
  }
  const skills = student?.skills;
  if (Array.isArray(skills)) {
    for (const s of skills) {
      if (typeof s === "string") terms.push(s);
      else if (s && typeof s === "object" && "name" in s) {
        const n = (s as { name?: string }).name;
        if (n) terms.push(n);
      }
    }
  }
  return new Set(terms.map((t) => t.toLowerCase()));
}

function buildReason(
  studentTerms: Set<string>,
  posting: { required_skills: string[] | null; preferred_skills: string[] | null } | undefined,
) {
  if (!posting) return "Recommended from profile similarity.";
  const postingTerms = [...(posting.required_skills ?? []), ...(posting.preferred_skills ?? [])].map(
    (value) => value.toLowerCase(),
  );
  const overlap = postingTerms.filter((term) => studentTerms.has(term));
  if (overlap.length > 0) {
    return `Strong skill overlap: ${overlap.slice(0, 3).join(", ")}.`;
  }
  return "Recommended from profile similarity (vector match).";
}

function heuristicRank(
  list: CandidateRow[],
  vectorScoreMap: Record<string, number>,
  studentTerms: Set<string>,
  postingById: Map<string, PostingRow>,
): RankedMatch[] {
  return list
    .sort((a, b) => b.vector_score - a.vector_score)
    .map((candidate, index) => ({
      posting_id: candidate.posting_id,
      vector_score: vectorScoreMap[candidate.posting_id] ?? candidate.vector_score,
      rank: index + 1,
      reason: buildReason(studentTerms, postingById.get(candidate.posting_id)),
    }));
}

function formatStudentSkills(skills: unknown): string {
  if (!skills) return "";
  if (Array.isArray(skills)) {
    return skills
      .map((s) => {
        if (typeof s === "string") return s;
        if (s && typeof s === "object" && "name" in s) {
          const o = s as { name?: string; proficiency?: string };
          return o.proficiency ? `${o.name} (${o.proficiency})` : String(o.name ?? "");
        }
        return String(s);
      })
      .filter(Boolean)
      .join(", ");
  }
  return String(skills);
}

function buildRankingPrompt(
  student: StudentRow,
  postings: PostingRow[],
  candidates: CandidateRow[],
): string {
  const vsMap = Object.fromEntries(candidates.map((c) => [c.posting_id, c.vector_score]));
  const major = Array.isArray(student.major) ? (student.major as string[]).join(", ") : String(student.major ?? "");
  const rf = Array.isArray(student.research_fields)
    ? (student.research_fields as string[]).join(", ")
    : "";
  const rt = Array.isArray(student.research_topics)
    ? (student.research_topics as string[]).join(", ")
    : "";
  const skills = formatStudentSkills(student.skills);
  const labEq = Array.isArray(student.lab_equipment)
    ? (student.lab_equipment as string[]).join(", ")
    : "";
  const prog = Array.isArray(student.programming_languages)
    ? (student.programming_languages as string[]).join(", ")
    : "";
  const prior = Array.isArray(student.prior_experience)
    ? (student.prior_experience as string[]).join(", ")
    : "";
  const expTypes = Array.isArray(student.experience_types)
    ? (student.experience_types as string[]).join(", ")
    : "";
  const mot = Array.isArray(student.motivations) ? (student.motivations as string[]).join(", ") : "";
  const pri = Array.isArray(student.priorities) ? (student.priorities as string[]).join(", ") : "";

  const postingBlocks = postings.map((p) => {
    const lab = p.lab_groups;
    return `
ID: ${p.id}
Title: ${p.title} at ${lab?.name ?? "Lab"} (${lab?.university ?? ""}, ${lab?.department ?? ""})
Lab fields: ${(lab?.research_fields ?? []).join(", ")}
Lab tags: ${(lab?.research_tags ?? []).join(", ")}
Required skills: ${(p.required_skills ?? []).join(", ")}
Preferred skills: ${(p.preferred_skills ?? []).join(", ")}
Preferred year: ${(p.preferred_year ?? []).join(", ")}
Hours: ${p.hours_per_week ?? "n/a"}/week | Paid: ${p.is_paid ?? "n/a"} | Duration: ${p.duration ?? "n/a"}
Min GPA: ${p.min_gpa ?? "none"} (${p.gpa_enforcement ?? "n/a"})
Vector similarity: ${(vsMap[p.id] ?? 0).toFixed(3)}
`.trim();
  });

  return `
You are a research opportunity matching assistant for a university research platform.
Re-rank these role postings from best to worst fit for this student.

## Student Profile
Year: ${String(student.year ?? "")} | Major: ${major}
Research interests: ${rf}
Specific topics: ${rt}
Skills: ${skills}
Equipment experience: ${labEq}
Programming: ${prog}
Prior experience: ${prior}
Looking for: ${expTypes}
Motivations: ${mot}
Priorities: ${pri}
Time commitment: ${String(student.time_commitment ?? "")} | Paid preference: ${String(student.paid_preference ?? "")}

## Role Postings to Rank
${postingBlocks.join("\n\n")}

## Instructions
Return a JSON array only, best fit first. Each object must have:
- "posting_id": string (must be one of the IDs above)
- "rank": integer starting at 1
- "reason": one sentence explaining the fit for THIS specific student

You may omit postings that are clearly a bad match. Do not include markdown. Return valid JSON only.
`.trim();
}

export type SearchRankedMatch = RankedMatch;

export type RoleSearchRankings = {
  matches: SearchRankedMatch[];
  /** Present when matches is empty because embedding or RPC failed. */
  error?: string;
};

async function readEdgeFunctionErrorBody(err: unknown): Promise<string | undefined> {
  if (!(err instanceof FunctionsHttpError)) return undefined;
  const res = err.context as Response | undefined;
  if (!res?.clone) return undefined;
  try {
    const j = (await res.clone().json()) as { error?: string; message?: string };
    if (typeof j.error === "string") return j.error;
    if (typeof j.message === "string") return j.message;
  } catch {
    try {
      const t = await res.clone().text();
      return t.trim().slice(0, 400) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeEmbeddingVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const nums = raw.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
    return nums.length > 0 ? nums : null;
  }
  if (raw && typeof raw === "object") {
    const vals = Object.values(raw as Record<string, unknown>)
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n));
    return vals.length > 0 ? vals : null;
  }
  return null;
}

export async function rankRolePostingsForSearchQuery(
  studentId: string,
  query: string,
): Promise<RoleSearchRankings> {
  const q = query.trim();
  if (!q) {
    return { matches: [] };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const { data: fnRes, error: embedError } = await supabase.functions.invoke<{
    ok?: boolean;
    embedding?: unknown;
    reason?: string;
    skipped?: boolean;
    error?: string;
  }>("generate-embedding", {
    body: { mode: "query_embed", text: q },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  const embeddingVec = fnRes ? normalizeEmbeddingVector(fnRes.embedding) : null;

  if (embedError) {
    const detail = await readEdgeFunctionErrorBody(embedError);
    console.error("[search] generate-embedding invoke error:", embedError.message, detail ?? "");
    return {
      matches: [],
      error:
        detail ||
        embedError.message ||
        "Could not reach the embedding service. Redeploy the generate-embedding function and check Edge Function logs.",
    };
  }
  if (!fnRes?.ok || !embeddingVec || embeddingVec.length === 0) {
    const hint =
      fnRes?.error ||
      fnRes?.reason ||
      (typeof fnRes === "object" && fnRes ? JSON.stringify(fnRes).slice(0, 400) : "");
    console.error("[search] generate-embedding response:", hint);
    if (fnRes?.error === "supabase_ai_session_unavailable" || hint.includes("supabase_ai_session_unavailable")) {
      return {
        matches: [],
        error:
          "Supabase AI (gte-small) is not available in this Edge Function runtime. Enable AI / inference for Edge Functions in your Supabase project, or run embeddings in an environment where globalThis.Supabase.ai.Session exists. See Supabase docs: Edge Functions + AI.",
      };
    }
    return {
      matches: [],
      error: hint ? `Embedding failed: ${hint}` : "Embedding failed (no vector returned).",
    };
  }

  if (embeddingVec.length !== 384) {
    console.error("[search] embedding length is", embeddingVec.length, "expected 384 (gte-small).");
    return {
      matches: [],
      error: `Embedding size was ${embeddingVec.length} but the database expects 384 dimensions.`,
    };
  }

  const embeddingJson = `[${embeddingVec.join(",")}]`;
  const { data: candidates, error: rpcError } = await supabase.rpc("vector_match_role_postings_by_embedding", {
    p_embedding: embeddingJson,
    p_limit: 50,
  });

  if (rpcError) {
    console.error("[search] vector_match_role_postings_by_embedding:", rpcError.message, rpcError);
    return { matches: [], error: `Database search failed: ${rpcError.message}` };
  }
  if (!candidates || (candidates as CandidateRow[]).length === 0) {
    console.warn("[search] RPC returned 0 rows (open postings with non-null embeddings required).");
    return { matches: [] };
  }

  const list = candidates as CandidateRow[];
  const postingIds = list.map((c) => c.posting_id);
  const vectorScoreMap = Object.fromEntries(list.map((c) => [c.posting_id, c.vector_score]));

  const { data: student } = await supabase
    .from("student_profiles")
    .select(
      "year, major, research_fields, research_topics, skills, lab_equipment, programming_languages, prior_experience, experience_types, motivations, priorities, time_commitment, paid_preference",
    )
    .eq("id", studentId)
    .maybeSingle<StudentRow>();

  const { data: postings } = await supabase
    .from("role_postings")
    .select(
      `
      id, title, description, member_role, is_paid, hours_per_week, duration, start_date,
      required_skills, preferred_skills, preferred_year, preferred_majors,
      min_gpa, gpa_enforcement, priority_courses,
      lab_groups ( name, university, department, research_fields, research_tags, lab_environment )
    `,
    )
    .in("id", postingIds)
    .returns<PostingRow[]>();

  const postingById = new Map((postings ?? []).map((p) => [p.id, p]));
  const qLower = q.toLowerCase();
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  let ranked: RankedMatch[] | null = null;

  if (apiKey && postings && postings.length > 0) {
    try {
      const prompt = buildSearchQueryRankingPrompt(q, student ?? null, postings, list);
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const parsed = safeJsonParse<LlmRankItem[]>(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validIds = new Set(postingIds);
            const seen = new Set<string>();
            const rows = parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.posting_id === "string" &&
                  validIds.has(item.posting_id) &&
                  typeof item.rank === "number" &&
                  typeof item.reason === "string",
              )
              .filter((item) => {
                if (seen.has(item.posting_id)) return false;
                seen.add(item.posting_id);
                return true;
              })
              .sort((a, b) => a.rank - b.rank)
              .map((item, index) => ({
                posting_id: item.posting_id,
                vector_score: vectorScoreMap[item.posting_id] ?? 0,
                rank: index + 1,
                reason: item.reason.slice(0, 500),
              }));
            if (rows.length > 0) ranked = rows;
          }
        }
      }
    } catch {
      ranked = null;
    }
  }

  if (!ranked || ranked.length === 0) {
    ranked = heuristicSearchRank(list, vectorScoreMap, qLower, postingById);
  }

  return { matches: ranked };
}

function heuristicSearchRank(
  list: CandidateRow[],
  vectorScoreMap: Record<string, number>,
  queryLc: string,
  postingById: Map<string, PostingRow>,
): RankedMatch[] {
  const qWords = new Set(
    queryLc
      .split(/\W+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 2),
  );
  return list
    .sort((a, b) => b.vector_score - a.vector_score)
    .map((candidate, index) => {
      const p = postingById.get(candidate.posting_id);
      const text = [p?.title, p?.description, ...(p?.required_skills ?? []), p?.lab_groups?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const hit = [...qWords].filter((w) => text.includes(w));
      const reason =
        hit.length > 0
          ? `Matches your search (${hit.slice(0, 4).join(", ")}).`
          : "Strong semantic match to your search.";
      return {
        posting_id: candidate.posting_id,
        vector_score: vectorScoreMap[candidate.posting_id] ?? candidate.vector_score,
        rank: index + 1,
        reason,
      };
    });
}

function buildSearchQueryRankingPrompt(
  searchQuery: string,
  student: StudentRow | null,
  postings: PostingRow[],
  candidates: CandidateRow[],
): string {
  const vsMap = Object.fromEntries(candidates.map((c) => [c.posting_id, c.vector_score]));
  const major = Array.isArray(student?.major) ? (student?.major as string[]).join(", ") : String(student?.major ?? "");
  const rf = Array.isArray(student?.research_fields)
    ? (student?.research_fields as string[]).join(", ")
    : "";
  const skills = formatStudentSkills(student?.skills);
  const postingBlocks = postings.map((p) => {
    const lab = p.lab_groups;
    return `
ID: ${p.id}
Title: ${p.title} at ${lab?.name ?? "Lab"} (${lab?.university ?? ""}, ${lab?.department ?? ""})
Lab fields: ${(lab?.research_fields ?? []).join(", ")}
Lab tags: ${(lab?.research_tags ?? []).join(", ")}
Required skills: ${(p.required_skills ?? []).join(", ")}
Preferred skills: ${(p.preferred_skills ?? []).join(", ")}
Preferred year: ${(p.preferred_year ?? []).join(", ")}
Hours: ${p.hours_per_week ?? "n/a"}/week | Paid: ${p.is_paid ?? "n/a"} | Duration: ${p.duration ?? "n/a"}
Vector similarity to search: ${(vsMap[p.id] ?? 0).toFixed(3)}
`.trim();
  });

  return `
You are a research opportunity matching assistant for a university research platform.
The student ran a text search. Re-rank these open role postings for relevance to the SEARCH QUERY first,
then for fit to the student profile (secondary).

## Search query
"${searchQuery.replace(/"/g, '\\"')}"

## Student profile (context; use when comparing otherwise similar postings)
Year: ${String(student?.year ?? "")} | Major: ${major}
Research interests: ${rf}
Skills: ${skills}
Time: ${String(student?.time_commitment ?? "")} | Paid: ${String(student?.paid_preference ?? "")}

## Role postings
${postingBlocks.join("\n\n")}

## Instructions
Return a JSON array only, best match first. Each object must have:
- "posting_id": string (one of the IDs above)
- "rank": integer starting at 1
- "reason": one sentence: why this posting fits the search query and (if relevant) the student

You may omit clear mismatches. No markdown. Valid JSON only.
`.trim();
}
