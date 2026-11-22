"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 py-16 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#F7E9E2] text-[#8B3D1F]">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-4xl">Something went wrong.</h1>
        <p className="mt-3 text-ink-soft">
          The page could not load. This is usually temporary — try again.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-ink-soft">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className="btn-primary px-5 py-3">
            <RotateCcw className="size-4" aria-hidden /> Try again
          </button>
          <Link href="/discover" className="btn-secondary px-5 py-3">
            Go to Discover
          </Link>
        </div>
      </div>
    </main>
  );
}
