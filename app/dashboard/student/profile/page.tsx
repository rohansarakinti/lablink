import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentProfileEditor } from "./student-profile-editor";

function toCsv(value: string[] | null | undefined) {
  return (value ?? []).join(", ");
}

export default async function StudentProfilePage({
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
    redirect("/auth/sign-in?role=student");
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

  if (!profile || profile.role !== "student") {
    redirect("/dashboard/professor");
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select(
      "full_name,university,major,minor,year,graduation_month,graduation_year,gpa,is_gpa_visible,willing_to_volunteer,research_fields,research_topics,ranked_interests,skills,programming_languages,lab_equipment,software_tools,prior_experience,experience_details,relevant_courses,role_types_sought,experience_types,priorities,motivations,time_commitment,paid_preference,start_availability,honors_or_awards,publications,resume_url,transcript_url",
    )
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string | null;
      university: string | null;
      major: string[] | null;
      minor: string[] | null;
      year: string | null;
      graduation_month: number | null;
      graduation_year: number | null;
      gpa: number | null;
      is_gpa_visible: boolean;
      willing_to_volunteer: boolean;
      research_fields: string[] | null;
      research_topics: string[] | null;
      ranked_interests: string[] | null;
      skills: string[] | null;
      programming_languages: string[] | null;
      lab_equipment: string[] | null;
      software_tools: string[] | null;
      prior_experience: string[] | null;
      experience_details: string | null;
      relevant_courses: string[] | null;
      role_types_sought: string[] | null;
      experience_types: string[] | null;
      priorities: string[] | null;
      motivations: string[] | null;
      time_commitment: string | null;
      paid_preference: string | null;
      start_availability: string | null;
      honors_or_awards: string | null;
      publications: string | null;
      resume_url: string | null;
      transcript_url: string | null;
    }>();

  const values = {
    display_name: profile.display_name ?? "",
    email: profile.email ?? "",
    avatar_url: profile.avatar_url ?? "",
    full_name: student?.full_name ?? profile.display_name ?? "",
    university: student?.university ?? "",
    major: toCsv(student?.major),
    minor: toCsv(student?.minor),
    year: student?.year ?? "",
    graduation_month: student?.graduation_month != null ? String(student.graduation_month) : "",
    graduation_year: student?.graduation_year != null ? String(student.graduation_year) : "",
    gpa: student?.gpa != null ? String(student.gpa) : "",
    is_gpa_visible: String(student?.is_gpa_visible ?? true),
    willing_to_volunteer: String(student?.willing_to_volunteer ?? true),
    research_fields: toCsv(student?.research_fields),
    research_topics: toCsv(student?.research_topics),
    ranked_interests: toCsv(student?.ranked_interests),
    skills: toCsv(student?.skills),
    programming_languages: toCsv(student?.programming_languages),
    lab_equipment: toCsv(student?.lab_equipment),
    software_tools: toCsv(student?.software_tools),
    prior_experience: toCsv(student?.prior_experience),
    experience_details: student?.experience_details ?? "",
    relevant_courses: toCsv(student?.relevant_courses),
    role_types_sought: toCsv(student?.role_types_sought),
    experience_types: toCsv(student?.experience_types),
    priorities: toCsv(student?.priorities),
    motivations: toCsv(student?.motivations),
    time_commitment: student?.time_commitment ?? "",
    paid_preference: student?.paid_preference ?? "",
    start_availability: student?.start_availability ?? "",
    honors_or_awards: student?.honors_or_awards ?? "",
    publications: student?.publications ?? "",
    resume_url: student?.resume_url ?? "",
    transcript_url: student?.transcript_url ?? "",
  };

  return (
    <StudentProfileEditor values={values} saved={query.saved === "1"} />
  );
}
