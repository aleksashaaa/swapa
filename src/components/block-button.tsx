"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldOff, UserX } from "lucide-react";
import { blockUser, unblockUser } from "@/app/(app)/profile/actions";

export function BlockButton({
  userId,
  name,
  blocked,
}: {
  userId: string;
  name: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>, redirect: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirm(false);
      if (redirect) router.push("/discover");
      else router.refresh();
    });
  };

  if (blocked) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => unblockUser(userId), false)}
          className="btn-secondary px-4 py-2 text-sm"
        >
          <ShieldOff className="size-4" aria-hidden /> Unblock
        </button>
        {error && <span className="text-xs text-[#8B3D1F]">{error}</span>}
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setConfirm(true)} className="btn-secondary px-4 py-2 text-sm text-[#8B3D1F]">
        <UserX className="size-4" aria-hidden /> Block
      </button>
      {confirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-cream p-6 shadow-2xl">
            <h2 className="font-display text-3xl">Block {name}?</h2>
            <p className="mt-3 text-sm text-ink-soft">
              Their items will be hidden from your Discover feed and any open matches between you will
              close. Existing conversations stay readable but become read-only.
            </p>
            {error && <p className="mt-3 rounded-xl bg-[#F7E9E2] px-3 py-2 text-sm text-[#8B3D1F]">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirm(false)} className="btn-secondary px-5 py-2.5">
                Cancel
              </button>
              <button
                onClick={() => run(() => blockUser(userId), true)}
                disabled={pending}
                className="rounded-full bg-[#8B3D1F] px-5 py-2.5 font-semibold text-white transition hover:bg-[#6F2F17] disabled:opacity-50"
              >
                {pending ? "Blocking…" : "Block person"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
