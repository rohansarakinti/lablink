import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type LabMembershipRow = {
  lab_role: string;
  lab_groups: {
    id: string;
    name: string;
    tagline: string | null;
    university: string;
    banner_url: string | null;
    logo_url: string | null;
  } | null;
};

export default async function ProfessorLabsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=professor");
  }

  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select("lab_role,lab_groups(id,name,tagline,university,banner_url,logo_url)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: false })
    .returns<LabMembershipRow[]>();

  const labs = memberships ?? [];

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-1 w-16 rounded-full bg-ll-purple" aria-hidden />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ll-navy md:text-4xl">My labs</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
            Labs you belong to and quick links to manage them.
          </p>
        </div>
        <Link
          href="/labs/new"
          className="w-fit shrink-0 rounded-full bg-ll-navy px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ll-navy/20 transition hover:bg-[#004c58]"
        >
          Create lab
        </Link>
      </div>

      {labs.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-ll-purple/25 bg-ll-bg/70 p-10 text-center">
          <p className="text-sm font-medium text-zinc-700">
            No labs yet. Create your first lab to start posting opportunities.
          </p>
          <Link
            href="/labs/new"
            className="mt-5 inline-flex rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#004c58]"
          >
            Create a lab
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {labs.map((membership) =>
            membership.lab_groups ? (
              <Link
                key={membership.lab_groups.id}
                href={`/labs/${membership.lab_groups.id}`}
                className="group block"
              >
                <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-md shadow-ll-navy/8 ring-1 ring-zinc-100 transition duration-200 hover:-translate-y-0.5 hover:border-ll-purple/20 hover:shadow-xl hover:shadow-ll-purple/10">
                  <div className="relative h-48 w-full shrink-0 overflow-hidden bg-ll-bg">
                    {membership.lab_groups.banner_url ? (
                      <Image
                        src={membership.lab_groups.banner_url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ll-bg">
                        {membership.lab_groups.logo_url ? (
                          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-md">
                            <Image
                              src={membership.lab_groups.logo_url}
                              alt=""
                              fill
                              className="object-contain p-1"
                              sizes="96px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className="text-5xl font-bold text-zinc-400" aria-hidden>
                            {membership.lab_groups.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="inline-flex self-start rounded-full bg-ll-purple/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ll-navy ring-1 ring-ll-navy/10">
                      {membership.lab_role.replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-3 text-lg font-semibold text-ll-navy">{membership.lab_groups.name}</h2>
                    <p className="mt-1 text-sm font-medium text-ll-navy/90">{membership.lab_groups.university}</p>
                    {membership.lab_groups.tagline ? (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{membership.lab_groups.tagline}</p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-ll-purple transition group-hover:text-ll-navy">
                      Manage lab <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </article>
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
