"use client";

import { useActionState, useState } from "react";
import { Flag, X } from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import { REPORT_REASONS } from "@/lib/constants";
import type { ReportTarget } from "@/lib/types";
import { submitReport, type FormState } from "@/app/(app)/profile/actions";

export function ReportDialog({
  targetType,
  targetId,
  label = "Report",
  compact = false,
}: {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(submitReport, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-1 text-xs text-ink-soft hover:text-[#8B3D1F]"
            : "btn-secondary px-4 py-2 text-sm text-[#8B3D1F]"
        }
      >
        <Flag className="size-3.5" aria-hidden /> {label}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-cream p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Safety</p>
                <h2 className="mt-2 font-display text-3xl">Report {targetType}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full border border-line bg-white" aria-label="Close">
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {state.message ? (
              <div className="mt-5 space-y-4">
                <FormAlert message={state.message} />
                <button onClick={() => setOpen(false)} className="btn-primary w-full py-3">
                  Close
                </button>
              </div>
            ) : (
              <form action={action} className="mt-5 space-y-4">
                <input type="hidden" name="target_type" value={targetType} />
                <input type="hidden" name="target_id" value={targetId} />
                <label className="block">
                  <span className="eyebrow">Reason</span>
                  <select name="reason" className="field mt-2" required defaultValue="">
                    <option value="" disabled>
                      Choose a reason
                    </option>
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="eyebrow">Details <span className="normal-case tracking-normal text-ink-soft">· optional</span></span>
                  <textarea name="details" className="field mt-2 min-h-24 resize-y" maxLength={1000} placeholder="What should moderators know?" />
                </label>
                <FormAlert error={state.error} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-5 py-2.5">
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5">
                    {pending ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
