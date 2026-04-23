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

const DEFAULT_BANNERS = [
  "/lab-banners/lab-1.jpg",
  "/lab-banners/lab-2.jpg",
  "/lab-banners/lab-3.jpg",
  "/lab-banners/lab-4.jpg",
];

function getBanner(labId: string): string {
  let hash = 0;
  for (let i = 0; i < labId.length; i++) {
    hash = labId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_BANNERS[Math.abs(hash) % DEFAULT_BANNERS.length];
}

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ll-navy md:text-4xl">My labs</h1>
          <p className="mt-2 text-sm text-ll-gray">
            Labs you belong to and quick links to manage them.
          </p>
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
        <div className="grid gap-4 md:grid-cols-3">
          {labs.map((membership) =>
            membership.lab_groups ? (
              <Link
                key={membership.lab_groups.id}
                href={`/labs/${membership.lab_groups.id}`}
                className="group block"
              >
                <article className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">

                  {/* Fixed-height banner — same for every card */}
                  <div className="h-48 w-full flex-shrink-0 overflow-hidden bg-zinc-100">
                    <img
                      src={getBanner(membership.lab_groups.id)}
                      alt={membership.lab_groups.name}
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>

                  {/* Body — fixed height so all cards are the same total size */}
                  <div className="p-5 flex flex-col flex-1">
                    <p className="inline-flex self-start rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase text-zinc-700">
                      {membership.lab_role.replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-3 text-lg font-semibold text-ll-navy">
                      {membership.lab_groups.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {membership.lab_groups.university}
                    </p>
                    {membership.lab_groups.tagline ? (
                      <p className="mt-2 text-sm text-ll-gray line-clamp-2">
                        {membership.lab_groups.tagline}
                      </p>
                    ) : null}
                    {/* Pushes Manage lab to the bottom of every card */}
                    <span className="mt-auto pt-4 inline-block text-sm font-medium text-ll-navy underline">
                      Manage lab
                    </span>
                  </div>
                </article>
              </Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}