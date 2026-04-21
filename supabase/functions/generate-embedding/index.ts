import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  table?: "student_profiles" | "role_postings";
  record?: Record<string, unknown>;
  // Supabase DB webhooks may send `new`/`old` keys.
  new?: Record<string, unknown>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    const table = payload.table;
    const record = payload.record ?? payload.new;
    console.log(
      JSON.stringify({
        event: "generate_embedding_request",
        table,
        payload_keys: Object.keys(payload ?? {}),
        record_keys: record && typeof record === "object" ? Object.keys(record) : [],
      }),
    );
    if (!table || (table !== "student_profiles" && table !== "role_postings")) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: `unsupported_table:${String(table)}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    if (!record || typeof record !== "object") {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "missing_record_payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const text =
      table === "student_profiles" ? buildStudentText(record) : buildPostingText(record);
    if (!text.trim()) {
      return new Response(JSON.stringify({ ok: false, reason: "empty_embedding_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const vector = await computeEmbedding(text);

    if (!record.id) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "missing_record_id" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ embedding: vector })
      .eq("id", record.id);
    if (updateError) {
      throw new Error(`update_failed:${updateError.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "generate_embedding_error",
        error: error instanceof Error ? error.message : "unknown_error",
        stack: error instanceof Error ? error.stack : null,
      }),
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

function buildStudentText(r: Record<string, unknown>): string {
  const skills = toStringList(r.skills).join(", ");
  return [
    `Research interests: ${toStringList(r.research_fields).join(", ")}.`,
    `Specific topics: ${toStringList(r.research_topics).join(", ")}.`,
    `Skills: ${skills}.`,
    `Equipment: ${toStringList(r.lab_equipment).join(", ")}.`,
    `Programming: ${toStringList(r.programming_languages).join(", ")}.`,
    `Prior experience: ${toStringList(r.prior_experience).join(", ")}.`,
    `Looking for: ${toStringList(r.experience_types).join(", ")}.`,
    `Year: ${String(r.year ?? "")}. Major: ${toStringList(r.major).join(", ")}.`,
  ].join(" ");
}

function buildPostingText(r: Record<string, unknown>): string {
  return [
    `Title: ${String(r.title ?? "")}.`,
    `Description: ${String(r.description ?? "")}.`,
    `Required skills: ${toStringList(r.required_skills).join(", ")}.`,
    `Preferred skills: ${toStringList(r.preferred_skills).join(", ")}.`,
    `Preferred year: ${toStringList(r.preferred_year).join(", ")}.`,
    `Preferred majors: ${toStringList(r.preferred_majors).join(", ")}.`,
    `Duration: ${String(r.duration ?? "")}.`,
    `Hours: ${String(r.hours_per_week ?? "")} per week.`,
    `Paid: ${String(r.is_paid ?? "")}.`,
  ].join(" ");
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

async function computeEmbedding(text: string): Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SupabaseRuntime = (globalThis as any).Supabase;
  if (!SupabaseRuntime?.ai?.Session) {
    throw new Error("supabase_ai_session_unavailable");
  }

  // Supabase docs: use `gte-small` for local semantic embeddings in Edge Functions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = new (SupabaseRuntime as any).ai.Session("gte-small");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embedding = (await model.run(text, { mean_pool: true, normalize: true })) as any;
  return Array.from(embedding as number[]);
}
