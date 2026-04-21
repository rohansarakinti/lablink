"use client";

import { parseResumeWithLlm, type AutofillResult } from "@/app/onboarding/autofill-actions";
import { extractTextFromFile } from "@/lib/onboarding/extract-text-from-file";

const MAX_BYTES = 10 * 1024 * 1024;

export type OnboardingFileParseError = { ok: false; message: string };

export type OnboardingFileParseSuccess = { ok: true; result: AutofillResult };

/**
 * Student and professor step-1 upload paths share this flow: size check → local text
 * extraction (with PDF safety bounds) → server-side LLM/heuristic autofill.
 */
export async function parseOnboardingFileForRole(
  file: File,
  role: "student" | "professor",
): Promise<OnboardingFileParseError | OnboardingFileParseSuccess> {
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "File is too large. Please upload a file under 10MB." };
  }
  const text = await extractTextFromFile(file);
  const result = await parseResumeWithLlm(role, text);
  return { ok: true, result };
}
