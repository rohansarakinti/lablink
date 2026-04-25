/**
 * Reset demo state so Anushka can apply to Smith's posting again during a skit.
 *
 * This script is idempotent:
 * - Deletes Anushka's application(s) to the target Smith posting
 * - Removes any Anushka membership in Smith lab (if she got accepted during a prior take)
 * - Ensures the target posting is open
 *
 * Usage:
 *   PowerShell:
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   npm run reset:anushka-smith
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

const IDS = {
  anushka: "e2222222-2222-4222-8222-222222222222",
  smithLab: "e3333333-3333-4333-8333-333333333333",
  smithPosting: "e4444444-4444-4444-8444-444444444441",
};

async function main() {
  console.log("Resetting Anushka ⇄ Smith posting demo state...");

  const { data: existingApps, error: existingAppsError } = await supabase
    .from("applications")
    .select("id,status,created_at")
    .eq("posting_id", IDS.smithPosting)
    .eq("student_id", IDS.anushka);

  if (existingAppsError) {
    throw new Error(`Could not read existing applications: ${existingAppsError.message}`);
  }

  if ((existingApps ?? []).length > 0) {
    const { error: deleteAppsError } = await supabase
      .from("applications")
      .delete()
      .eq("posting_id", IDS.smithPosting)
      .eq("student_id", IDS.anushka);
    if (deleteAppsError) {
      throw new Error(`Could not delete existing applications: ${deleteAppsError.message}`);
    }
  }

  const { data: existingMemberships, error: existingMembershipsError } = await supabase
    .from("lab_memberships")
    .select("id,lab_role,is_active")
    .eq("lab_id", IDS.smithLab)
    .eq("user_id", IDS.anushka);

  if (existingMembershipsError) {
    throw new Error(`Could not read lab memberships: ${existingMembershipsError.message}`);
  }

  if ((existingMemberships ?? []).length > 0) {
    const { error: deleteMembershipsError } = await supabase
      .from("lab_memberships")
      .delete()
      .eq("lab_id", IDS.smithLab)
      .eq("user_id", IDS.anushka);
    if (deleteMembershipsError) {
      throw new Error(`Could not delete lab memberships: ${deleteMembershipsError.message}`);
    }
  }

  const { error: postingUpdateError } = await supabase
    .from("role_postings")
    .update({ status: "open" })
    .eq("id", IDS.smithPosting);
  if (postingUpdateError) {
    throw new Error(`Could not ensure posting is open: ${postingUpdateError.message}`);
  }

  console.log("Done.");
  console.log(`- Removed applications: ${(existingApps ?? []).length}`);
  console.log(`- Removed Smith-lab memberships for Anushka: ${(existingMemberships ?? []).length}`);
  console.log("- Ensured Smith posting status is open.");
  console.log("");
  console.log("You can now run your skit and submit the application from UI.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

