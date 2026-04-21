"use server";

import { createClient } from "@/lib/supabase/server";

type EmbeddingTable = "student_profiles" | "role_postings";

export async function requestEmbeddingRefresh(table: EmbeddingTable, record: Record<string, unknown>) {
  try {
    const supabase = await createClient();
    await supabase.functions.invoke("generate-embedding", {
      body: { table, record },
    });
  } catch {
    // Non-blocking: matching will fallback until embedding is available.
  }
}
