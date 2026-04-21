"use client";

import { useMemo, useState } from "react";
import { bulkUpdateApplicationStatus, updateApplicationReviewerNotes, updateApplicationStatus } from "../../../../actions";

type ReviewRow = {
  id: string;
  studentName: string;
  yearText: string;
  majorText: string;
  gpaText: string;
  appliedDateText: string;
  statement: string | null;
  reviewerNotes: string | null;
  resumeUrl: string | null;
  transcriptUrl: string | null;
  status: string;
};

type ReviewTableProps = {
  labId: string;
  postingId: string;
  rows: ReviewRow[];
  statusOptions: string[];
};

export function ReviewTable({ labId, postingId, rows, statusOptions }: ReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = useMemo(
    () => rows.length > 0 && selectedIds.length === rows.length,
    [rows.length, selectedIds.length],
  );

  function toggleAll() {
    setSelectedIds(allSelected ? [] : rows.map((row) => row.id));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <form action={bulkUpdateApplicationStatus} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <input type="hidden" name="lab_id" value={labId} />
        <input type="hidden" name="posting_id" value={postingId} />
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="application_ids" value={id} />
        ))}
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
          Bulk actions ({selectedIds.length} selected)
        </p>
        <button
          type="submit"
          name="status"
          value="reviewing"
          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
        >
          Move selected to reviewing
        </button>
        <button
          type="submit"
          name="status"
          value="rejected"
          className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700"
        >
          Reject selected
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2 pr-4 font-medium">
                <button type="button" onClick={toggleAll} className="text-xs underline">
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              </th>
              <th className="py-2 pr-4 font-medium">Applicant</th>
              <th className="py-2 pr-4 font-medium">Year / major</th>
              <th className="py-2 pr-4 font-medium">GPA</th>
              <th className="py-2 pr-4 font-medium">Applied</th>
              <th className="py-2 pr-4 font-medium">Materials</th>
              <th className="py-2 font-medium">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4 align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.studentName}`}
                    className="mt-1 h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="py-3 pr-4 align-top">
                  <p className="font-medium text-ll-navy">{row.studentName}</p>
                </td>
                <td className="py-3 pr-4 align-top text-zinc-600">
                  {row.yearText} / {row.majorText}
                </td>
                <td className="py-3 pr-4 align-top text-zinc-600">{row.gpaText}</td>
                <td className="py-3 pr-4 align-top text-zinc-600">{row.appliedDateText}</td>
                <td className="py-3 pr-4 align-top text-zinc-600">
                  <div className="space-y-1">
                    {row.resumeUrl ? (
                      <a href={row.resumeUrl} className="block text-ll-navy underline">
                        Resume
                      </a>
                    ) : (
                      <p>Resume: —</p>
                    )}
                    {row.transcriptUrl ? (
                      <a href={row.transcriptUrl} className="block text-ll-navy underline">
                        Transcript
                      </a>
                    ) : (
                      <p>Transcript: —</p>
                    )}
                    {row.statement ? <p className="line-clamp-3">Statement: {row.statement}</p> : <p>Statement: —</p>}
                  </div>
                </td>
                <td className="py-3 align-top">
                  <div className="space-y-2">
                    <form action={updateApplicationStatus} className="flex items-center gap-2">
                      <input type="hidden" name="lab_id" value={labId} />
                      <input type="hidden" name="posting_id" value={postingId} />
                      <input type="hidden" name="application_id" value={row.id} />
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
                      >
                        {statusOptions.map((status) => (
                          <option key={`${row.id}-${status}`} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700"
                      >
                        Update
                      </button>
                    </form>
                    <form action={updateApplicationReviewerNotes} className="space-y-2">
                      <input type="hidden" name="lab_id" value={labId} />
                      <input type="hidden" name="posting_id" value={postingId} />
                      <input type="hidden" name="application_id" value={row.id} />
                      <textarea
                        name="reviewer_notes"
                        defaultValue={row.reviewerNotes ?? ""}
                        rows={3}
                        placeholder="Private reviewer notes"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700"
                      >
                        Save notes
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
