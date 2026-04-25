import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopSearch } from "@/components/student/student-top-search";

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: profileGate } = await supabase
    .from("profiles")
    .select("role,onboarding_complete")
    .eq("id", user.id)
    .single<{ role: "student" | "professor"; onboarding_complete: boolean }>();

  if (!profileGate || profileGate.role !== "student") {
    redirect("/dashboard/professor");
  }

  if (!profileGate.onboarding_complete) {
    redirect("/onboarding/student");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; email: string }>();

  const displayName = profile?.display_name?.trim() || profile?.email || "Student";

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1600px]">
        <StudentSidebar displayName={displayName} />
        <div className="ll-animate-fade-in flex min-w-0 flex-1 flex-col">
          <Suspense
            fallback={
              <div
                className="ll-loader-shimmer h-[52px] border-b border-zinc-200/90 bg-linear-to-r from-zinc-100 via-zinc-200 to-zinc-100 md:h-[60px]"
                aria-hidden
              />
            }
          >
            <StudentTopSearch />
          </Suspense>
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
