import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfessorProfileEditor } from "./professor-profile-editor";

function toCsv(value: string[] | null | undefined) {
  return (value ?? []).join(", ");
}

export default async function ProfessorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=professor");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email,avatar_url,role")
    .eq("id", user.id)
    .maybeSingle<{
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
      role: "student" | "professor";
    }>();

  if (!profile || profile.role !== "professor") {
    redirect("/dashboard/student");
  }

  const { data: prof } = await supabase
    .from("professor_profiles")
    .select(
      "full_name,title,university,department,office_location,lab_website,cv_url,google_scholar_url,orcid,research_fields,research_keywords,research_summary,preferred_student_year,preferred_majors,preferred_experience_level,mentorship_style,lab_culture,profile_visibility,notify_new_applications,notify_weekly_digest",
    )
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string | null;
      title: string | null;
      university: string | null;
      department: string | null;
      office_location: string | null;
      lab_website: string | null;
      cv_url: string | null;
      google_scholar_url: string | null;
      orcid: string | null;
      research_fields: string[] | null;
      research_keywords: string[] | null;
      research_summary: string | null;
      preferred_student_year: string[] | null;
      preferred_majors: string[] | null;
      preferred_experience_level: string | null;
      mentorship_style: string[] | null;
      lab_culture: string[] | null;
      profile_visibility: string;
      notify_new_applications: boolean;
      notify_weekly_digest: boolean;
    }>();

  const values = {
    display_name: profile.display_name ?? "",
    email: profile.email ?? "",
    avatar_url: profile.avatar_url ?? "",
    full_name: prof?.full_name ?? profile.display_name ?? "",
    title: prof?.title ?? "",
    university: prof?.university ?? "",
    department: prof?.department ?? "",
    office_location: prof?.office_location ?? "",
    lab_website: prof?.lab_website ?? "",
    cv_url: prof?.cv_url ?? "",
    google_scholar_url: prof?.google_scholar_url ?? "",
    orcid: prof?.orcid ?? "",
    research_fields: toCsv(prof?.research_fields),
    research_keywords: toCsv(prof?.research_keywords),
    research_summary: prof?.research_summary ?? "",
    preferred_student_year: toCsv(prof?.preferred_student_year),
    preferred_majors: toCsv(prof?.preferred_majors),
    preferred_experience_level: prof?.preferred_experience_level ?? "",
    mentorship_style: toCsv(prof?.mentorship_style),
    lab_culture: toCsv(prof?.lab_culture),
    profile_visibility: prof?.profile_visibility ?? "public",
    notify_new_applications: String(prof?.notify_new_applications ?? true),
    notify_weekly_digest: String(prof?.notify_weekly_digest ?? true),
  };

  return <ProfessorProfileEditor values={values} saved={query.saved === "1"} />;
}
