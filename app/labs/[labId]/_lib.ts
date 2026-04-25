import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const labFeedPosterRoles = ["pi", "lab_manager", "postdoc", "grad_researcher"] as const;

export function canPostToLabFeed(labRole: string): boolean {
  return (labFeedPosterRoles as readonly string[]).includes(labRole);
}

export type LabContext = {
  userId: string;
  canManage: boolean;
  canPostToFeed: boolean;
  membershipRole: string;
  lab: {
    id: string;
    created_by: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    university: string;
    department: string | null;
    website_url: string | null;
    logo_url: string | null;
    banner_url: string | null;
    research_fields: string[];
    research_tags: string[];
    gallery_urls: string[];
    student_fit: string | null;
    expectations: string | null;
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

  const { data: anyMembership } = membership
    ? { data: membership }
    : await supabase
        .from("lab_memberships")
        .select("lab_role")
        .eq("lab_id", labId)
        .eq("user_id", user.id)
        .maybeSingle<{ lab_role: string }>();

  const { data: labByUserClient } = await supabase
    .from("lab_groups")
    .select("id,created_by,name,slug,tagline,description,university,department,website_url,logo_url,banner_url,research_fields,research_tags")
    .eq("id", labId)
    .maybeSingle<
      Pick<
        LabContext["lab"],
        | "id"
        | "created_by"
        | "name"
        | "slug"
        | "tagline"
        | "description"
        | "university"
        | "department"
        | "website_url"
        | "logo_url"
        | "banner_url"
        | "research_fields"
        | "research_tags"
      >
    >();

  const adminClient =
    !labByUserClient && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  const { data: labByAdminClient } = adminClient
    ? await adminClient
        .from("lab_groups")
        .select("id,created_by,name,slug,tagline,description,university,department,website_url,logo_url,banner_url,research_fields,research_tags")
        .eq("id", labId)
        .maybeSingle<
          Pick<
            LabContext["lab"],
            | "id"
            | "created_by"
            | "name"
            | "slug"
            | "tagline"
            | "description"
            | "university"
            | "department"
            | "website_url"
            | "logo_url"
            | "banner_url"
            | "research_fields"
            | "research_tags"
          >
        >()
    : { data: null };

  const lab = labByUserClient ?? labByAdminClient;

  const membershipRole = membership?.lab_role ?? anyMembership?.lab_role ?? (lab?.created_by === user.id ? "pi" : null);
  if (!membershipRole) {
    redirect("/dashboard/professor");
  }

  const canManage = membershipRole === "pi" || membershipRole === "lab_manager";
  const canPostToFeed = canPostToLabFeed(membershipRole);

  return {
    userId: user.id,
    canManage,
    canPostToFeed,
    membershipRole,
    lab: lab
      ? {
          ...lab,
          research_fields: Array.isArray(lab.research_fields) ? lab.research_fields : [],
          research_tags: Array.isArray(lab.research_tags) ? lab.research_tags : [],
          gallery_urls: [],
          student_fit: null,
          expectations: null,
        }
      : {
          id: labId,
          created_by: user.id,
          name: "Lab",
          slug: "",
          tagline: null,
          description: null,
          university: "",
          department: null,
          website_url: null,
          logo_url: null,
          banner_url: null,
          research_fields: [],
          research_tags: [],
          gallery_urls: [],
          student_fit: null,
          expectations: null,
        },
  };
}
