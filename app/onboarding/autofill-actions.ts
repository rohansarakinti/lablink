"use server";

import {
  buildProfessorAutofill,
  buildStudentAutofill,
  type ProfessorAutofill,
  type StudentAutofill,
} from "@/lib/onboarding/autofill";

type AutofillRole = "student" | "professor";

type AutofillResult = {
  ok: boolean;
  source: "llm" | "heuristic";
  data: StudentAutofill | ProfessorAutofill;
  message?: string;
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeStudent(raw: Record<string, unknown>): StudentAutofill {
  return {
    full_name: cleanString(raw.full_name),
    university: cleanString(raw.university),
    year: cleanString(raw.year),
    graduation_month: cleanString(raw.graduation_month),
    graduation_year: cleanString(raw.graduation_year),
    gpa: cleanString(raw.gpa),
    major: cleanString(raw.major),
    minor: cleanString(raw.minor),
    skills: cleanString(raw.skills),
    programming_languages: cleanString(raw.programming_languages),
    research_fields: cleanString(raw.research_fields),
    research_topics: cleanString(raw.research_topics),
    ranked_interests: cleanString(raw.ranked_interests),
    lab_equipment: cleanString(raw.lab_equipment),
    software_tools: cleanString(raw.software_tools),
    prior_experience: cleanString(raw.prior_experience),
    experience_details: cleanString(raw.experience_details),
    relevant_courses: cleanString(raw.relevant_courses),
    honors_or_awards: cleanString(raw.honors_or_awards),
    publications: cleanString(raw.publications),
    role_types_sought: cleanString(raw.role_types_sought),
    time_commitment: cleanString(raw.time_commitment),
    paid_preference: cleanString(raw.paid_preference),
    experience_types: cleanString(raw.experience_types),
    motivations: cleanString(raw.motivations),
    priorities: cleanString(raw.priorities),
    start_availability: cleanString(raw.start_availability),
  };
}

function sanitizeProfessor(raw: Record<string, unknown>): ProfessorAutofill {
  return {
    full_name: cleanString(raw.full_name),
    university: cleanString(raw.university),
    department: cleanString(raw.department),
    title: cleanString(raw.title),
    office_location: cleanString(raw.office_location),
    lab_website: cleanString(raw.lab_website),
    google_scholar_url: cleanString(raw.google_scholar_url),
    orcid: cleanString(raw.orcid),
    research_fields: cleanString(raw.research_fields),
    research_keywords: cleanString(raw.research_keywords),
    research_summary: cleanString(raw.research_summary),
    preferred_experience_level: cleanString(raw.preferred_experience_level),
    preferred_student_year: cleanString(raw.preferred_student_year),
    preferred_majors: cleanString(raw.preferred_majors),
    mentorship_style: cleanString(raw.mentorship_style),
    lab_culture: cleanString(raw.lab_culture),
  };
}

function buildPrompt(role: AutofillRole, text: string): string {
  if (role === "student") {
    return `
Extract student onboarding fields from this resume text.
Return JSON only (no markdown, no explanation) with this shape:
{
  "full_name": string | null,
  "university": string | null,
  "year": string | null,
  "graduation_month": string | null,
  "graduation_year": string | null,
  "gpa": string | null,
  "major": string | null,
  "minor": string | null,
  "skills": string | null,
  "programming_languages": string | null,
  "research_fields": string | null,
  "research_topics": string | null,
  "ranked_interests": string | null,
  "lab_equipment": string | null,
  "software_tools": string | null,
  "prior_experience": string | null,
  "experience_details": string | null,
  "relevant_courses": string | null,
  "honors_or_awards": string | null,
  "publications": string | null,
  "role_types_sought": string | null,
  "time_commitment": string | null,
  "paid_preference": string | null,
  "experience_types": string | null,
  "motivations": string | null,
  "priorities": string | null,
  "start_availability": string | null
}

Guidelines:
- Use comma-separated strings for multi-value outputs.
- Keep "year" to one of: freshman, sophomore, junior, senior, graduate, other.
- Keep "prior_experience" to one of: none, some_coursework, prior_lab, industry, extensive.
- Keep "paid_preference" to one of: paid_only, open_to_unpaid, either.
- Use null when unknown.
- Do not invent facts.

Resume text:
${text}
`.trim();
  }

  return `
Extract professor onboarding fields from this CV text.
Return JSON only (no markdown, no explanation) with this shape:
{
  "full_name": string | null,
  "university": string | null,
  "department": string | null,
  "title": string | null,
  "research_fields": string | null,
  "research_keywords": string | null,
  "office_location": string | null,
  "lab_website": string | null,
  "google_scholar_url": string | null,
  "orcid": string | null,
  "research_summary": string | null,
  "preferred_experience_level": string | null,
  "preferred_student_year": string | null,
  "preferred_majors": string | null,
  "mentorship_style": string | null,
  "lab_culture": string | null
}

Guidelines:
- Use comma-separated strings for multi-value outputs.
- Keep "preferred_experience_level" to one of: none, intro_courses, prior_experience.
- Keep "preferred_student_year" and "preferred_majors" as comma-separated values matching common degree/year wording.
- Keep "mentorship_style" to one of: hands_on, collaborative, independent.
- Keep "lab_culture" to one of: fast_paced, balanced, exploratory.
- Use null when unknown.
- Do not invent facts.

CV text:
${text}
`.trim();
}

export async function parseResumeWithLlm(role: AutofillRole, rawText: string): Promise<AutofillResult> {
  const text = rawText.slice(0, 25000);
  const fallback =
    role === "student" ? buildStudentAutofill(text) : buildProfessorAutofill(text);

  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      source: "heuristic",
      data: fallback,
      message: "Missing GOOGLE_AI_STUDIO_API_KEY, used heuristic parsing.",
    };
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(role, text) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      return {
        ok: true,
        source: "heuristic",
        data: fallback,
        message: `LLM request failed (${response.status}), used heuristic parsing.`,
      };
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return {
        ok: true,
        source: "heuristic",
        data: fallback,
        message: "LLM returned empty response, used heuristic parsing.",
      };
    }

    const parsed = safeJsonParse<Record<string, unknown>>(raw);
    if (!parsed) {
      return {
        ok: true,
        source: "heuristic",
        data: fallback,
        message: "LLM JSON parsing failed, used heuristic parsing.",
      };
    }

    return {
      ok: true,
      source: "llm",
      data: role === "student" ? sanitizeStudent(parsed) : sanitizeProfessor(parsed),
      message:
        "AI auto-fill complete. Review all pre-filled fields and edit anything that looks off before submitting.",
    };
  } catch {
    return {
      ok: true,
      source: "heuristic",
      data: fallback,
      message: "LLM unavailable, used heuristic parsing.",
    };
  }
}
