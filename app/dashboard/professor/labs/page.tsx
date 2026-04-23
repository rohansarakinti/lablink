import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LabMembershipRow = {
  lab_role: string;
  lab_groups: {
    id: string;
    name: string;
    tagline: string | null;
    university: string;
  } | null;
};

export default async function ProfessorLabsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select("lab_role,lab_groups(id,name,tagline,university)")
    .eq("user_id", user?.id ?? "")
    .eq("is_active", true)
    .returns<LabMembershipRow[]>();

  const labs = memberships ?? [];

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ll-navy md:text-4xl">My labs</h1>
          <p className="mt-2 text-sm text-ll-gray">Labs you belong to and quick links to manage them.</p>
        </div>
        <Link
          href="/labs/new"
          className="w-fit rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Create lab
        </Link>
      </div>

      {labs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <p className="text-sm text-ll-gray">
            No labs yet. Create your first lab to start posting opportunities.
          </p>
          <Link href="/labs/new" className="mt-4 inline-block text-sm font-medium text-ll-navy underline">
            Create a lab
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {labs.map((membership) =>
            membership.lab_groups ? (
              <article
                key={membership.lab_groups.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <p className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-700">
                  {membership.lab_role.replaceAll("_", " ")}
                </p>
                <h2 className="mt-3 text-lg font-semibold text-ll-navy">{membership.lab_groups.name}</h2>
                <p className="mt-1 text-sm text-zinc-600">{membership.lab_groups.university}</p>
                {membership.lab_groups.tagline ? (
                  <p className="mt-2 text-sm text-ll-gray">{membership.lab_groups.tagline}</p>
                ) : null}
                <Link
                  href={`/labs/${membership.lab_groups.id}`}
                  className="mt-4 inline-block text-sm font-medium text-ll-navy underline"
                >
                  Manage lab
                </Link>
              </article>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
