"use server";

import { createClient } from "@/lib/supabase/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type CandidateRow = { student_id: string; vector_score: number };

type StudentRow = {
  id: string;
  full_name: string | null;
  year: string | null;
  major: string[] | null;
  gpa: number | null;
  research_fields: string[] | null;
  skills: string[] | null;
  programming_languages: string[] | null;
  prior_experience: string[] | null;
  time_commitment: string | null;
  paid_preference: string | null;
};

type PostingRow = {
  id: string;
  title: string;
  description: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  preferred_year: string[] | null;
  preferred_majors: string[] | null;
  min_gpa: number | null;
  gpa_enforcement: string | null;
  hours_per_week: string | null;
  is_paid: string | null;
  lab_groups: { name: string; university: string } | null;
};

export type RankedStudentForPosting = {
  student_id: string;
  vector_score: number;
  rank: number;
  reason: string;
};

type LlmRankItem = { student_id: string; rank: number; reason: string };

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function heuristicReason(posting: PostingRow | null, student: StudentRow | undefined): string {
  if (!posting || !student) return "Recommended by profile similarity.";
  const postingSkills = [...(posting.required_skills ?? []), ...(posting.preferred_skills ?? [])].map((s) =>
    s.toLowerCase(),
  );
  const studentSkills = new Set((student.skills ?? []).map((s) => s.toLowerCase()));
  const overlap = postingSkills.filter((term) => studentSkills.has(term));
  if (overlap.length > 0) return `Strong overlap in ${overlap.slice(0, 3).join(", ")}.`;
  return "Recommended by profile similarity.";
}

function buildPrompt(posting: PostingRow, candidates: CandidateRow[], students: StudentRow[]): string {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const blocks = candidates
    .map((candidate) => {
      const student = studentById.get(candidate.student_id);
      if (!student) return null;
      return `
ID: ${student.id}
Name: ${student.full_name ?? "Unknown"}
Year: ${student.year ?? "n/a"}
Major: ${(student.major ?? []).join(", ")}
GPA: ${student.gpa ?? "n/a"}
Research fields: ${(student.research_fields ?? []).join(", ")}
Skills: ${(student.skills ?? []).join(", ")}
Programming: ${(student.programming_languages ?? []).join(", ")}
Prior experience: ${(student.prior_experience ?? []).join(", ")}
Time commitment: ${student.time_commitment ?? "n/a"} | Paid pref: ${student.paid_preference ?? "n/a"}
Vector similarity: ${(candidate.vector_score ?? 0).toFixed(3)}
`.trim();
    })
    .filter(Boolean);

  return `
You are helping a professor rank student applicants for a research role.
Re-rank these students from best to worst fit for this specific posting.

## Posting
Title: ${posting.title}
Lab: ${posting.lab_groups?.name ?? "Lab"} (${posting.lab_groups?.university ?? ""})
Description: ${posting.description ?? ""}
Required skills: ${(posting.required_skills ?? []).join(", ")}
Preferred skills: ${(posting.preferred_skills ?? []).join(", ")}
Preferred year: ${(posting.preferred_year ?? []).join(", ")}
Preferred majors: ${(posting.preferred_majors ?? []).join(", ")}
Min GPA: ${posting.min_gpa ?? "none"} (${posting.gpa_enforcement ?? "n/a"})
Hours: ${posting.hours_per_week ?? "n/a"} | Paid: ${posting.is_paid ?? "n/a"}

## Students
${blocks.join("\n\n")}

## Instructions
Return valid JSON array only, best first.
Each object:
- "student_id": string (one of listed IDs)
- "rank": integer starting at 1
- "reason": one concise sentence why they fit this posting.
`.trim();
}

const LLM_CANDIDATE_CAP = 45;

/**
 * Ranks *only* students who have applied to this posting (applicantStudentIds).
 * Uses the posting embedding vs student embeddings when available; everyone still gets a row.
 */
export async function rankStudentsForPosting(
  postingId: string,
  applicantStudentIds: string[],
): Promise<RankedStudentForPosting[]> {
  const supabase = await createClient();
  const uniqueIds = [...new Set(applicantStudentIds)];
  if (uniqueIds.length === 0) return [];

  const { data: rpcRaw } = await supabase.rpc("vector_match_students_for_posting", {
    p_posting_id: postingId,
    p_limit: 200,
  });
  const globalMatches = (rpcRaw ?? []) as CandidateRow[];
  const vectorById = new Map(globalMatches.map((row) => [row.student_id, row.vector_score]));

  // One row per applicant: use vector score if this student appeared in the RPC list
  const perApplicant: CandidateRow[] = uniqueIds
    .map((id) => ({
      student_id: id,
      vector_score: vectorById.get(id) ?? 0,
    }))
    .sort((a, b) => b.vector_score - a.vector_score || a.student_id.localeCompare(b.student_id));

  const studentIds = perApplicant.map((r) => r.student_id);
  const vectorMap = Object.fromEntries(perApplicant.map((r) => [r.student_id, r.vector_score]));

  const [{ data: posting }, { data: students }] = await Promise.all([
    supabase
      .from("role_postings")
      .select(
        "id,title,description,required_skills,preferred_skills,preferred_year,preferred_majors,min_gpa,gpa_enforcement,hours_per_week,is_paid,lab_groups(name,university)",
      )
      .eq("id", postingId)
      .maybeSingle<PostingRow>(),
    supabase
      .from("student_profiles")
      .select(
        "id,full_name,year,major,gpa,research_fields,skills,programming_languages,prior_experience,time_commitment,paid_preference",
      )
      .in("id", studentIds)
      .returns<StudentRow[]>(),
  ]);

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const validApplicantIdSet = new Set(uniqueIds);
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

  // LLM: cap candidate count for context size; prefer strongest embeddings first
  const forLlm = perApplicant.slice(0, LLM_CANDIDATE_CAP);
  const forLlmIds = new Set(forLlm.map((c) => c.student_id));

  if (apiKey && posting && forLlm.length > 0) {
    const llmStudents = (students ?? []).filter((s) => forLlmIds.has(s.id));
    try {
      const prompt = buildPrompt(posting, forLlm, llmStudents);
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
            const used = new Set<string>();
            const out: RankedStudentForPosting[] = [];
            let nextRank = 1;

            const sortedLlm = parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.student_id === "string" &&
                  validApplicantIdSet.has(item.student_id) &&
                  forLlmIds.has(item.student_id) &&
                  typeof item.rank === "number" &&
                  typeof item.reason === "string",
              )
              .sort((a, b) => a.rank - b.rank);

            for (const item of sortedLlm) {
              if (used.has(item.student_id)) continue;
              used.add(item.student_id);
              out.push({
                student_id: item.student_id,
                vector_score: vectorMap[item.student_id] ?? 0,
                rank: nextRank++,
                reason: item.reason.slice(0, 500),
              });
            }
            // Applicants not in LLM output: append by vector order among remaining
            for (const row of forLlm) {
              if (used.has(row.student_id)) continue;
              out.push({
                student_id: row.student_id,
                vector_score: row.vector_score,
                rank: nextRank++,
                reason: heuristicReason(posting, studentsById.get(row.student_id)),
              });
            }
            // Applicants beyond LLM cap (forLlm): append by vector order
            const seenAll = new Set(out.map((r) => r.student_id));
            for (const row of perApplicant) {
              if (seenAll.has(row.student_id)) continue;
              seenAll.add(row.student_id);
              out.push({
                student_id: row.student_id,
                vector_score: row.vector_score,
                rank: nextRank++,
                reason: heuristicReason(posting, studentsById.get(row.student_id)),
              });
            }
            if (out.length > 0) return out;
          }
        }
      }
    } catch {
      // fall through
    }
  }

  // Fallback: pure vector / heuristic, everyone included
  return perApplicant.map((item, index) => ({
    student_id: item.student_id,
    vector_score: item.vector_score,
    rank: index + 1,
    reason:
      item.vector_score > 0
        ? heuristicReason(posting ?? null, studentsById.get(item.student_id))
        : "Similarity unavailable until student and posting embeddings are generated; ranked after stronger matches.",
  }));
}
