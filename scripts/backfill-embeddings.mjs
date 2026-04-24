/**
 * Backfill vector embeddings by invoking the generate-embedding Edge Function
 * for rows where embedding IS NULL.
 *
 * Prerequisites:
 * - Deploy: `supabase functions deploy generate-embedding`
 * - Secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` (see supabase/functions/generate-embedding/README.md)
 * - Supabase project has AI / inference enabled for Edge Functions (gte-small)
 *
 * Usage (from repo root):
 *   set SUPABASE_URL=https://xxxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/backfill-embeddings.mjs
 *
 * PowerShell:
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."; node scripts/backfill-embeddings.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function embedRow(table, record) {
  const { data, error } = await supabase.functions.invoke("generate-embedding", {
    body: { table, record },
  });
  if (error) {
    console.error(`FAIL ${table} ${record.id}`, error.message);
    return false;
  }
  if (data && data.ok === false) {
    console.error(`SKIP ${table} ${record.id}`, JSON.stringify(data));
    return false;
  }
  console.log(`OK ${table} ${record.id}`);
  return true;
}

async function backfillTable(table, pageSize = 40) {
  let total = 0;
  for (;;) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .is("embedding", null)
      .limit(pageSize);
    if (error) {
      console.error(`Query ${table}:`, error.message);
      process.exit(1);
    }
    if (!rows?.length) break;
    for (const row of rows) {
      await embedRow(table, row);
      total += 1;
    }
    if (rows.length < pageSize) break;
  }
  console.log(`Done ${table}: embedded ${total} row(s) that previously had null embedding.`);
}

async function main() {
  console.log("Backfilling student_profiles…");
  await backfillTable("student_profiles");
  console.log("Backfilling role_postings…");
  await backfillTable("role_postings");
  console.log("Backfilling lab_posts…");
  await backfillTable("lab_posts");
  console.log("Finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
