import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LabCreateForm } from "./lab-create-form";

type ProfessorProfile = {
  university: string | null;
};

export default async function NewLabPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
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
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profile || profile.role !== "professor") {
    redirect("/dashboard/student");
  }

  if (!profile.onboarding_complete) {
    redirect("/onboarding/professor");
  }

  const { data: professorProfile } = await supabase
    .from("professor_profiles")
    .select("university")
    .eq("id", user.id)
    .maybeSingle<ProfessorProfile>();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-ll-bg/40">
      <div className="relative mx-auto w-full max-w-4xl px-6 py-12">
        <div className="mb-2 h-1 w-16 rounded-full bg-ll-purple" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight text-ll-navy md:text-4xl">Create a new lab</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Set up your lab identity, research focus, and posting settings in two quick steps.
        </p>
        <LabCreateForm
          defaultUniversity={professorProfile?.university ?? ""}
          error={query.error}
          errorDetail={query.detail}
        />
      </div>
    </main>
  );
}
