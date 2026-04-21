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
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ll-navy">Members</h2>
        {context.canManage ? (
          <form action={createInviteLink} className="flex items-center gap-2">
            <input type="hidden" name="lab_id" value={labId} />
            <select
              name="invite_role"
              defaultValue="lab_manager"
              className="rounded-full border border-zinc-300 px-3 py-2 text-xs text-zinc-700"
            >
              <option value="lab_manager">Lab manager</option>
              <option value="postdoc">Postdoc</option>
              <option value="grad_researcher">Grad researcher</option>
            </select>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Generate invite link
            </button>
          </form>
        ) : null}
      </div>
      {query.invite_link ? (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          Invite link: {query.invite_link}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">University</th>
              <th className="py-2 pr-4 font-medium">Joined</th>
              {context.canManage ? <th className="py-2 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(members ?? []).map((member) => (
              <tr key={member.id}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-ll-navy">{member.profiles?.display_name ?? member.profiles?.email}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs uppercase text-zinc-700">
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
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
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
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700"
                        >
                          Save
                        </button>
                      </form>
                      <form action={removeMember}>
                        <input type="hidden" name="lab_id" value={labId} />
                        <input type="hidden" name="membership_id" value={member.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700"
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
  );
}
