import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLabsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: myLabs } = await supabase
    .from("lab_memberships")
    .select("id,joined_at,lab_role,lab_groups(id,name,logo_url,university)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("lab_role", ["undergrad_ra", "lab_technician", "volunteer", "grad_researcher", "postdoc"])
    .order("joined_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        joined_at: string;
        lab_role: string;
        lab_groups: { id: string; name: string; logo_url: string | null; university: string } | null;
      }>
    >();

  return (
    <div className="ll-animate-fade-up">
      <h1 className="text-2xl font-bold text-ll-navy md:text-3xl">Lab management</h1>
      <p className="ll-animate-fade-up ll-delay-100 mt-1 text-sm text-zinc-600">Labs where you are an active member.</p>

      <section className="ll-animate-fade-up ll-delay-200 mt-6">
        {(myLabs ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center text-sm text-zinc-600">
            You are not a member of any lab yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(myLabs ?? []).map((membership) =>
              membership.lab_groups ? (
                <article key={membership.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md">
                  <h2 className="text-lg font-semibold text-ll-navy">{membership.lab_groups.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{membership.lab_groups.university}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                    Role: {membership.lab_role.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Joined {new Date(membership.joined_at).toLocaleDateString()}</p>
                </article>
              ) : null,
            )}
          </div>
        )}
      </section>
    </div>
  );
}
