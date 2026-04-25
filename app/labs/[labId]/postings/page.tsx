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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-ll-navy to-ll-purple" aria-hidden />
          <h2 className="mt-2 text-2xl font-semibold text-ll-navy">Role postings</h2>
          <p className="mt-1 text-sm text-zinc-600">Open roles, track applicants, and update status.</p>
        </div>
        {context.canManage ? (
          <Link
            href={`/labs/${labId}/postings/new`}
            className="w-fit rounded-full bg-gradient-to-r from-ll-navy to-[#0a5c6a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ll-navy/25 transition hover:brightness-105"
          >
            New posting
          </Link>
        ) : null}
      </div>

      {(postings ?? []).length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-ll-purple/25 bg-gradient-to-br from-ll-bg/70 via-white to-ll-purple/10 p-10 text-center">
          <p className="text-sm font-medium text-zinc-700">No postings yet.</p>
          <p className="mt-2 text-sm text-zinc-500">Create a role to start recruiting students to your lab.</p>
          {context.canManage ? (
            <Link
              href={`/labs/${labId}/postings/new`}
              className="mt-5 inline-flex rounded-full bg-ll-navy px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#0a5c6a]"
            >
              Create first posting
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {(postings ?? []).map((posting) => (
            <article
              key={posting.id}
              className="group relative overflow-hidden rounded-3xl border border-zinc-100 bg-white/95 p-6 shadow-md shadow-ll-navy/5 transition hover:border-ll-purple/20 hover:shadow-lg"
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 ${postingStatusStripeClass(posting.status)}`}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <h3 className="text-lg font-semibold text-ll-navy">{posting.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${postingStatusBadgeClass(posting.status)}`}>
                  {posting.status}
                </span>
              </div>
              <p className="mt-4 pl-2 text-sm text-zinc-600">
                <span className="font-semibold text-ll-navy">{posting.applications?.length ?? 0}</span> applicants
              </p>
              <p className="mt-1 pl-2 text-sm text-zinc-600">
                Deadline:{" "}
                <span className="font-medium text-zinc-800">
                  {posting.application_deadline ? new Date(posting.application_deadline).toLocaleDateString() : "Not set"}
                </span>
              </p>
              <Link
                href={`/labs/${labId}/postings/${posting.id}/applicants`}
                className="mt-4 inline-flex pl-2 text-sm font-semibold text-ll-navy underline decoration-ll-purple/45 decoration-2 underline-offset-4 transition hover:text-ll-purple"
              >
                Review applicants →
              </Link>

              {context.canManage ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 pl-2">
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

function postingStatusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-ll-bg text-ll-navy ring-1 ring-ll-navy/15";
    case "closed":
      return "bg-ll-purple/15 text-ll-navy ring-1 ring-ll-purple/25";
    case "draft":
      return "bg-ll-purple/10 text-ll-navy ring-1 ring-ll-purple/20";
    case "archived":
      return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
    default:
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80";
  }
}

function postingStatusStripeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-gradient-to-b from-ll-navy to-ll-purple";
    case "closed":
      return "bg-gradient-to-b from-ll-purple to-ll-navy/70";
    case "draft":
      return "bg-gradient-to-b from-ll-bg to-ll-purple";
    case "archived":
      return "bg-gradient-to-b from-zinc-400 to-zinc-300";
    default:
      return "bg-gradient-to-b from-zinc-400 to-zinc-300";
  }
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
  const styles =
    status === "open"
      ? "border-ll-navy/20 bg-ll-bg text-ll-navy hover:bg-ll-bg/80"
      : status === "closed"
        ? "border-ll-purple/25 bg-ll-purple/10 text-ll-navy hover:bg-ll-purple/20"
        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100";

  return (
    <form action={updatePostingStatus}>
      <input type="hidden" name="lab_id" value={labId} />
      <input type="hidden" name="posting_id" value={postingId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize shadow-sm transition ${styles}`}
      >
        {status}
      </button>
    </form>
  );
}
