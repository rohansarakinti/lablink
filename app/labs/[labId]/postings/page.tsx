import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabContext } from "../_lib";
import { updatePostingStatus } from "../actions";

type PostingRow = {
  id: string;
  title: string;
  status: string;
  application_deadline: string | null;
  applications: Array<{ id: string }> | null;
};

export default async function LabPostingsPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  const context = await getLabContext(labId);
  const supabase = await createClient();

  const { data: postings } = await supabase
    .from("role_postings")
    .select("id,title,status,application_deadline,applications(id)")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false })
    .returns<PostingRow[]>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ll-navy">Role postings</h2>
        {context.canManage ? (
          <Link
            href={`/labs/${labId}/postings/new`}
            className="rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white"
          >
            New posting
          </Link>
        ) : null}
      </div>

      {(postings ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          No postings yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(postings ?? []).map((posting) => (
            <article key={posting.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-ll-navy">{posting.title}</h3>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs uppercase text-zinc-700">
                  {posting.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-600">Applicants: {posting.applications?.length ?? 0}</p>
              <p className="mt-1 text-sm text-zinc-600">
                Deadline: {posting.application_deadline ? new Date(posting.application_deadline).toLocaleDateString() : "Not set"}
              </p>
              <Link
                href={`/labs/${labId}/postings/${posting.id}/applicants`}
                className="mt-3 inline-block text-sm font-medium text-ll-navy underline"
              >
                Review applicants
              </Link>

              {context.canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusButton labId={labId} postingId={posting.id} status="open" />
                  <StatusButton labId={labId} postingId={posting.id} status="closed" />
                  <StatusButton labId={labId} postingId={posting.id} status="archived" />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({
  labId,
  postingId,
  status,
}: {
  labId: string;
  postingId: string;
  status: "open" | "closed" | "archived";
}) {
  return (
    <form action={updatePostingStatus}>
      <input type="hidden" name="lab_id" value={labId} />
      <input type="hidden" name="posting_id" value={postingId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium capitalize text-zinc-700"
      >
        {status}
      </button>
    </form>
  );
}
