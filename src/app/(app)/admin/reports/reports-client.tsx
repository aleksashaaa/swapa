"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { formatDate } from "@/lib/format";
import { updateReportStatus } from "@/app/(app)/profile/actions";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  reporter: { full_name: string } | null;
};

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

export function ReportsClient({ reports }: { reports: Report[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!reports.length) {
    return (
      <div className="mt-8 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/55 p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
          <Flag className="size-6" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-3xl">No reports.</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Reports submitted by members will appear here for moderation.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-[#F7E9E2] px-4 py-3 text-sm text-[#8B3D1F]">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-[22px] border border-line bg-white/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{report.reason}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {report.target_type} · {report.target_id} · reported by{" "}
                  {report.reporter?.full_name ?? "unknown"} · {formatDate(report.created_at)}
                </p>
              </div>
              <span className="rounded-full bg-sage/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                {report.status}
              </span>
            </div>
            {report.details && <p className="mt-3 text-sm text-ink-soft">{report.details}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending || report.status === status}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await updateReportStatus(report.id, status);
                      if (result.error) setError(result.error);
                    })
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                    report.status === status
                      ? "border-sage-dark bg-sage-dark text-white"
                      : "border-line bg-white/70 text-ink-soft hover:border-sage-dark hover:text-ink"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
