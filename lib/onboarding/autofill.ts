export type StudentAutofill = {
  full_name?: string;
  university?: string;
  year?: string;
  graduation_month?: string;
  graduation_year?: string;
  gpa?: string;
  major?: string;
  minor?: string;
  skills?: string;
  programming_languages?: string;
  research_fields?: string;
  research_topics?: string;
  ranked_interests?: string;
  lab_equipment?: string;
  software_tools?: string;
  prior_experience?: string;
  experience_details?: string;
  relevant_courses?: string;
  honors_or_awards?: string;
  publications?: string;
  role_types_sought?: string;
  time_commitment?: string;
  paid_preference?: string;
  experience_types?: string;
  motivations?: string;
  priorities?: string;
  start_availability?: string;
};

export type ProfessorAutofill = {
  full_name?: string;
  university?: string;
  department?: string;
  title?: string;
  office_location?: string;
  lab_website?: string;
  google_scholar_url?: string;
  orcid?: string;
  research_fields?: string;
  research_keywords?: string;
  research_summary?: string;
  preferred_experience_level?: string;
  preferred_student_year?: string;
  preferred_majors?: string;
  mentorship_style?: string;
  lab_culture?: string;
};

const researchKeywords = [
  "neuroscience",
  "oncology",
  "immunology",
  "bioinformatics",
  "psychology",
  "public health",
  "genetics",
  "machine learning",
  "computer vision",
  "clinical research",
];

const skillKeywords = [
  "pcr",
  "cell culture",
  "flow cytometry",
  "microscopy",
  "western blot",
  "python",
  "r",
  "matlab",
  "sql",
  "imagej",
  "graphpad",
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractLikelyName(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
  if (/^[A-Za-z][A-Za-z\s.'-]{2,60}$/.test(firstLine)) return firstLine;
  const nameMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  return nameMatch?.[1];
}

function extractUniversity(text: string) {
  const match = text.match(
    /\b([A-Z][A-Za-z&.\s-]*(University|College|Institute|School))\b/i,
  );
  return match?.[1];
}

function extractDepartment(text: string) {
  const match = text.match(/\b(Department of [A-Za-z&\s-]+)\b/i);
  return match?.[1];
}

function extractTitle(text: string) {
  const candidates = [
    "Assistant Professor",
    "Associate Professor",
    "Professor",
    "Postdoctoral Researcher",
    "Research Scientist",
    "Lab Manager",
  ];
  const lower = text.toLowerCase();
  return candidates.find((c) => lower.includes(c.toLowerCase()));
}

function pickKeywords(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  const found = keywords.filter((k) => lower.includes(k.toLowerCase()));
  return found.join(", ");
}

export function buildStudentAutofill(rawText: string): StudentAutofill {
  const text = normalizeWhitespace(rawText);
  return {
    full_name: extractLikelyName(rawText),
    university: extractUniversity(rawText),
    major: text.match(/\b(Biology|Chemistry|Computer Science|Neuroscience|Psychology)\b/i)?.[0],
    skills: pickKeywords(text, skillKeywords),
    programming_languages: pickKeywords(text, ["python", "r", "matlab", "sql", "java", "c++"]),
    research_fields: pickKeywords(text, researchKeywords),
    research_topics: pickKeywords(text, ["crispr", "fMRI", "patch clamp", "single-cell", "imaging"]),
  };
}

export function buildProfessorAutofill(rawText: string): ProfessorAutofill {
  const text = normalizeWhitespace(rawText);
  return {
    full_name: extractLikelyName(rawText),
    university: extractUniversity(rawText),
    department: extractDepartment(rawText),
    title: extractTitle(rawText),
    research_fields: pickKeywords(text, researchKeywords),
    research_keywords: pickKeywords(text, ["crispr", "microscopy", "machine learning", "clinical", "genomics"]),
  };
}
