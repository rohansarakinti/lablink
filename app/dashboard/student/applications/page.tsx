import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id,posting_id,status,created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Array<{ id: string; posting_id: string; status: string; created_at: string }>>();

  const postingIds = Array.from(new Set((applications ?? []).map((application) => application.posting_id)));
  const { data: appliedPostings } =
    postingIds.length === 0
      ? { data: [] as Array<{ id: string; title: string; application_deadline: string | null; lab_id: string }> }
      : await supabase
          .from("role_postings")
          .select("id,title,application_deadline,lab_id")
          .in("id", postingIds)
          .returns<Array<{ id: string; title: string; application_deadline: string | null; lab_id: string }>>();

  const appliedLabIds = Array.from(new Set((appliedPostings ?? []).map((posting) => posting.lab_id)));
  const { data: appliedLabs } =
    appliedLabIds.length === 0
      ? { data: [] as Array<{ id: string; name: string; university: string; logo_url: string | null }> }
      : await supabase
          .from("lab_groups")
          .select("id,name,university,logo_url")
          .in("id", appliedLabIds)
          .returns<Array<{ id: string; name: string; university: string; logo_url: string | null }>>();

  const postingById = new Map((appliedPostings ?? []).map((posting) => [posting.id, posting]));
  const appliedLabById = new Map((appliedLabs ?? []).map((lab) => [lab.id, lab]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ll-navy md:text-3xl">Applications</h1>
      <p className="mt-1 text-sm text-zinc-600">Track roles you have applied to.</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        {(applications ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No applications yet.</p>
        ) : (
          <ul className="space-y-3">
            {(applications ?? []).map((application) => {
              const posting = postingById.get(application.posting_id);
              const lab = posting ? appliedLabById.get(posting.lab_id) : null;
              return (
                <li key={application.id} className="rounded-xl border border-zinc-200 p-4">
                  <p className="font-medium text-ll-navy">
                    {posting?.title ?? "Role posting"} · {lab?.name ?? "Lab"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Status: {application.status} · Applied {new Date(application.created_at).toLocaleDateString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
