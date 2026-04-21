import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LabContext = {
  userId: string;
  canManage: boolean;
  membershipRole: string;
  lab: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    university: string;
    department: string | null;
    website_url: string | null;
    logo_url: string | null;
  };
};

export async function getLabContext(labId: string): Promise<LabContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profile || profile.role !== "professor" || !profile.onboarding_complete) {
    redirect("/dashboard/student");
  }

  const { data: membership } = await supabase
    .from("lab_memberships")
    .select("lab_role")
    .eq("lab_id", labId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ lab_role: string }>();

  if (!membership) {
    redirect("/dashboard/professor");
  }

  const { data: lab } = await supabase
    .from("lab_groups")
    .select("id,name,slug,tagline,description,university,department,website_url,logo_url")
    .eq("id", labId)
    .maybeSingle<LabContext["lab"]>();

  if (!lab) {
    redirect("/dashboard/professor");
  }

  const canManage = membership.lab_role === "pi" || membership.lab_role === "lab_manager";

  return {
    userId: user.id,
    canManage,
    membershipRole: membership.lab_role,
    lab,
  };
}
