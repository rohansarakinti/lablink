import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfessorSidebar } from "@/components/professor/professor-sidebar";

export default async function ProfessorDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=professor");
  }

  const { data: profileGate } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profileGate || profileGate.role !== "professor") {
    redirect("/dashboard/student");
  }

  if (!profileGate.onboarding_complete) {
    redirect("/onboarding/professor");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; email: string }>();

  const displayName = profile?.display_name?.trim() || profile?.email || "Professor";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-100/90">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1600px]">
        <ProfessorSidebar displayName={displayName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
