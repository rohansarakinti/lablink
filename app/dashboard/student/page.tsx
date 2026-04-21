import { createClient } from "@/lib/supabase/server";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ display_name: string | null; email: string }>();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold text-ll-navy">Student dashboard</h1>
      <p className="mt-3 text-sm text-ll-gray">
        Welcome {profile?.display_name ?? profile?.email ?? "student"}.
      </p>
    </main>
  );
}
