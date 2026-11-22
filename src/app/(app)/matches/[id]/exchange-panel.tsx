"use client";

import { useActionState, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Handshake,
  Loader2,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import type { ExchangeAgreement, MatchStatus } from "@/lib/types";
import {
  agreeExchange,
  cancelExchange,
  completeExchange,
  submitReview,
  type ChatState,
} from "./actions";

export function ExchangePanel({
  matchId,
  agreement,
  matchStatus,
  isA,
  hasReviewed,
  otherName,
}: {
  matchId: string;
  agreement: ExchangeAgreement | null;
  matchStatus: MatchStatus;
  isA: boolean;
  hasReviewed: boolean;
  otherName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  const status = agreement?.status ?? null;
  const myAgreed = agreement ? (isA ? agreement.user_a_agreed : agreement.user_b_agreed) : false;
  const otherAgreed = agreement ? (isA ? agreement.user_b_agreed : agreement.user_a_agreed) : false;
  const myCompleted = agreement ? (isA ? agreement.user_a_completed : agreement.user_b_completed) : false;
  const otherCompleted = agreement ? (isA ? agreement.user_b_completed : agreement.user_a_completed) : false;

  return (
    <section className="rounded-[24px] border border-line bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Exchange</p>
          <h2 className="mt-1 font-display text-2xl">Agree before you swap.</h2>
        </div>
        <span className="rounded-full bg-sage/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-graphite">
          {status === "completed"
            ? "Completed"
            : status === "agreed"
              ? "Agreed"
              : status === "cancelled"
                ? "Cancelled"
                : status === "pending"
                  ? "Pending"
                  : "Not started"}
        </span>
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        Both people must agree before either item is reserved. Both must also confirm the swap
        happened.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#F7E9E2] px-3 py-2 text-sm text-[#8B3D1F]">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {(!agreement || status === "cancelled") && (
          <>
            {status === "cancelled" && (
              <p className="rounded-xl bg-sage/30 px-3 py-2 text-sm text-ink-soft">
                This exchange was cancelled. Both items are available again, and you can restart the
                agreement if you both still want to swap.
              </p>
            )}
            <button
              type="button"
              onClick={() => run(() => agreeExchange(matchId))}
              disabled={pending || matchStatus === "completed" || matchStatus === "cancelled"}
              className="btn-primary w-full py-3"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Handshake className="size-4" aria-hidden />}
              {status === "cancelled" ? "Start the exchange again" : "I want to swap"}
            </button>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <AgreementRow label="You agreed" done={myAgreed} />
              <AgreementRow label={`${otherName} agreed`} done={otherAgreed} />
            </div>
            {!myAgreed && (
              <button
                type="button"
                onClick={() => run(() => agreeExchange(matchId))}
                disabled={pending}
                className="btn-primary w-full py-3"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
                Confirm the exchange
              </button>
            )}
            {myAgreed && !otherAgreed && (
              <p className="rounded-xl bg-sage/30 px-3 py-2 text-center text-sm text-ink-soft">
                Waiting for {otherName} to agree. Nothing is reserved until they do.
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={pending}
              className="btn-secondary w-full py-2.5 text-sm text-[#8B3D1F]"
            >
              <X className="size-4" aria-hidden /> Cancel exchange
            </button>
          </>
        )}

        {status === "agreed" && (
          <>
            <div className="rounded-xl border border-sage-dark/30 bg-sage/30 px-4 py-3 text-sm">
              <p className="font-medium">Both items are reserved for this swap.</p>
              <p className="mt-1 text-ink-soft">
                Meet safely, swap the items, then both confirm below.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <AgreementRow label="You confirmed" done={myCompleted} />
              <AgreementRow label={`${otherName} confirmed`} done={otherCompleted} />
            </div>
            {!myCompleted ? (
              <button
                type="button"
                onClick={() => run(() => completeExchange(matchId))}
                disabled={pending}
                className="btn-primary w-full py-3"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                I received my item
              </button>
            ) : (
              <p className="rounded-xl bg-sage/30 px-3 py-2 text-center text-sm text-ink-soft">
                Waiting for {otherName} to confirm. The exchange completes when you both do.
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={pending}
              className="btn-secondary w-full py-2.5 text-sm text-[#8B3D1F]"
            >
              <X className="size-4" aria-hidden /> Cancel exchange
            </button>
          </>
        )}

        {status === "completed" && (
          <>
            <div className="rounded-xl border border-sage-dark/30 bg-sage/30 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-sage-dark" aria-hidden /> Swap completed
              </p>
              <p className="mt-1 text-ink-soft">
                Both items are marked completed. Thanks for keeping them in circulation.
              </p>
            </div>
            {hasReviewed ? (
              <p className="rounded-xl bg-sage/30 px-3 py-2 text-center text-sm text-ink-soft">
                You have reviewed this exchange.
              </p>
            ) : (
              <ReviewForm matchId={matchId} otherName={otherName} />
            )}
          </>
        )}
      </div>

      {confirmCancel && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-cream p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F7E9E2] text-[#8B3D1F]">
                <AlertTriangle className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-2xl">Cancel this exchange?</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  If the exchange was already agreed, both items return to Available. This cannot
                  undo a completed swap.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirmCancel(false)} className="btn-secondary px-5 py-2.5">
                Keep exchange
              </button>
              <button
                onClick={() => {
                  setConfirmCancel(false);
                  run(() => cancelExchange(matchId));
                }}
                disabled={pending}
                className="rounded-full bg-[#8B3D1F] px-5 py-2.5 font-semibold text-white transition hover:bg-[#6F2F17] disabled:opacity-50"
              >
                {pending ? "Cancelling…" : "Cancel exchange"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AgreementRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${done ? "border-sage-dark/30 bg-sage/30" : "border-line bg-white/60 text-ink-soft"}`}>
      <span className={`grid size-5 place-items-center rounded-full ${done ? "bg-sage-dark text-white" : "bg-line text-ink-soft"}`}>
        {done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : <X className="size-3" aria-hidden />}
      </span>
      {label}
    </div>
  );
}

function ReviewForm({ matchId, otherName }: { matchId: string; otherName: string }) {
  const [state, action, pending] = useActionState<ChatState, FormData>(submitReview, {});
  const [rating, setRating] = useState(5);

  if (state.message) {
    return (
      <div className="space-y-2">
        <FormAlert message={state.message} />
        <p className="text-center text-xs text-ink-soft">Reviews cannot be edited once submitted.</p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-line bg-cream p-4">
      <p className="font-display text-xl">How was swapping with {otherName}?</p>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <Star
              className={`size-7 transition ${value <= rating ? "fill-sage-dark text-sage-dark" : "text-line"}`}
              aria-hidden
            />
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Review</span>
        <textarea
          name="body"
          maxLength={1000}
          rows={3}
          placeholder="A short note about the item and the exchange. Optional."
          className="field resize-y"
        />
      </label>
      <FormAlert error={state.error} />
      <button type="submit" disabled={pending} className="btn-primary mt-3 w-full py-2.5 text-sm">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
        Publish review
      </button>
    </form>
  );
}
