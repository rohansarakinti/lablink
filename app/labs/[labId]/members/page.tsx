import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../_lib";
import { changeMemberRole, createInviteLink, removeMember } from "../actions";

type MemberRow = {
  id: string;
  user_id: string;
  lab_role: string;
  joined_at: string;
  profiles: {
    display_name: string | null;
    email: string;
    role: "student" | "professor";
  } | null;
};

export default async function LabMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string }>;
  searchParams: Promise<{ invite_link?: string }>;
}) {
  const { labId } = await params;
  const query = await searchParams;
  const context = await getLabContext(labId);
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("lab_memberships")
    .select("id,user_id,lab_role,joined_at,profiles(display_name,email,role)")
    .eq("lab_id", labId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .returns<MemberRow[]>();

  const memberIds = (members ?? []).map((member) => member.user_id);

  const [{ data: professorUniversities }, { data: studentUniversities }] =
    memberIds.length === 0
      ? [{ data: [] as Array<{ id: string; university: string | null }> }, { data: [] as Array<{ id: string; university: string | null }> }]
      : await Promise.all([
          supabase.from("professor_profiles").select("id,university").in("id", memberIds),
          supabase.from("student_profiles").select("id,university").in("id", memberIds),
        ]);

  const universityById = new Map<string, string | null>();
  (professorUniversities ?? []).forEach((row) => universityById.set(row.id, row.university));
  (studentUniversities ?? []).forEach((row) => {
    if (!universityById.has(row.id)) universityById.set(row.id, row.university);
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-ll-navy/10 bg-white/95 shadow-lg shadow-ll-navy/5">
      <div className="bg-white px-6 py-5 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-1 w-12 rounded-full bg-ll-purple" aria-hidden />
            <h2 className="mt-2 text-xl font-semibold text-ll-navy md:text-2xl">Members</h2>
            <p className="mt-1 text-base text-zinc-600">People in this lab and how they participate.</p>
          </div>
          {context.canManage ? (
            <form action={createInviteLink} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="lab_id" value={labId} />
              <select
                name="invite_role"
                defaultValue="lab_manager"
                className="rounded-full border border-ll-navy/15 bg-white px-3 py-2 text-sm font-medium text-ll-navy shadow-sm"
              >
                <option value="lab_manager">Lab manager</option>
                <option value="postdoc">Postdoc</option>
                <option value="grad_researcher">Grad researcher</option>
              </select>
              <button
                type="submit"
                className="rounded-full bg-ll-navy px-4 py-2 text-base font-semibold text-white shadow-md shadow-ll-navy/20 transition hover:bg-[#004c58]"
              >
                Generate invite link
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 md:px-8">
        {query.invite_link ? (
          <div className="mb-4 rounded-xl border border-ll-purple/25 bg-ll-purple/10 p-4 text-sm font-medium text-ll-navy">
            <span className="text-ll-purple">Invite link:</span>{" "}
            <span className="break-all font-mono text-ll-navy">{query.invite_link}</span>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white/80">
          <table className="min-w-full divide-y divide-zinc-100 text-base">
            <thead>
              <tr className="bg-ll-bg/80 text-left text-sm font-semibold uppercase tracking-wide text-zinc-600">
                <th className="py-3 pl-4 pr-4">Name</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">University</th>
                <th className="py-3 pr-4">Joined</th>
                {context.canManage ? <th className="py-3 pr-4">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {(members ?? []).map((member) => (
                <tr key={member.id} className="transition hover:bg-ll-bg/40">
                  <td className="py-3 pl-4 pr-4">
                    <p className="font-semibold text-ll-navy">{member.profiles?.display_name ?? member.profiles?.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold uppercase tracking-wide ${memberRolePillClass(member.lab_role)}`}>
                      {member.lab_role.replaceAll("_", " ")}
                    </span>
                  </td>
                <td className="py-3 pr-4 text-zinc-600">
                  {universityById.get(member.user_id) ?? "—"}
                </td>
                <td className="py-3 pr-4 text-zinc-600">{new Date(member.joined_at).toLocaleDateString()}</td>
                {context.canManage ? (
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <form action={changeMemberRole} className="flex items-center gap-2">
                        <input type="hidden" name="lab_id" value={labId} />
                        <input type="hidden" name="membership_id" value={member.id} />
                        <select
                          name="next_role"
                          defaultValue={member.lab_role}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-800 shadow-sm"
                        >
                          <option value="pi">PI</option>
                          <option value="lab_manager">Lab manager</option>
                          <option value="postdoc">Postdoc</option>
                          <option value="grad_researcher">Grad researcher</option>
                          <option value="undergrad_ra">Undergrad RA</option>
                          <option value="lab_technician">Lab technician</option>
                          <option value="volunteer">Volunteer</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-full border border-ll-purple/25 bg-ll-purple/10 px-3 py-1 text-sm font-semibold text-ll-navy transition hover:bg-ll-purple/20"
                        >
                          Save
                        </button>
                      </form>
                      <form action={removeMember}>
                        <input type="hidden" name="lab_id" value={labId} />
                        <input type="hidden" name="membership_id" value={member.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function memberRolePillClass(labRole: string): string {
  if (labRole === "pi" || labRole === "lab_manager") {
    return "bg-ll-navy text-white ring-1 ring-ll-navy/20";
  }
  if (labRole === "postdoc" || labRole === "grad_researcher") {
    return "bg-ll-purple/20 text-ll-navy ring-1 ring-ll-purple/30";
  }
  return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200/80";
}
