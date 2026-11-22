import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageSquareQuote, Star } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getReviewsGiven, getReviewsReceived } from "@/lib/data";
import { Stars } from "@/components/stars";
import { ReportDialog } from "@/components/report-dialog";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const session = await requireOnboarded();
  const [received, given] = await Promise.all([
    getReviewsReceived(session.supabase, session.userId),
    getReviewsGiven(session.supabase, session.userId),
  ]);

  const average =
    received.length > 0
      ? received.reduce((sum, review) => sum + review.rating, 0) / received.length
      : 0;

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Profile
      </Link>
      <p className="eyebrow mt-6">Reviews</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Trust, earned one <em className="italic text-sage-dark">swap at a time.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Reviews are only possible after a completed exchange, and each participant can leave one
        review per swap.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="font-display text-3xl">{average ? average.toFixed(1) : "—"}</p>
          <p className="mt-1 text-sm text-ink-soft">Average rating</p>
          <div className="mt-2">
            <Stars value={average} />
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="font-display text-3xl">{received.length}</p>
          <p className="mt-1 text-sm text-ink-soft">Reviews received</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="font-display text-3xl">{given.length}</p>
          <p className="mt-1 text-sm text-ink-soft">Reviews written</p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-sage text-sage-dark">
            <Star className="size-4" aria-hidden />
          </span>
          <h2 className="font-display text-3xl">Received</h2>
        </div>
        {received.length ? (
          <div className="mt-4 space-y-3">
            {received.map((review) => (
              <article key={review.id} className="rounded-[22px] border border-line bg-white/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark">
                      {review.reviewer?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={review.reviewer.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold">{initials(review.reviewer?.full_name)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{review.reviewer?.full_name ?? "SWAPA member"}</p>
                      <p className="text-xs text-ink-soft">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <Stars value={review.rating} />
                </div>
                {review.body && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{review.body}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/matches/${review.match_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sage-dark hover:text-ink"
                  >
                    View exchange <ArrowRight className="size-3" aria-hidden />
                  </Link>
                  <ReportDialog targetType="review" targetId={review.id} compact />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No reviews yet. Complete a swap and your partner can leave the first one." />
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-sage text-sage-dark">
            <MessageSquareQuote className="size-4" aria-hidden />
          </span>
          <h2 className="font-display text-3xl">Written by you</h2>
        </div>
        {given.length ? (
          <div className="mt-4 space-y-3">
            {given.map((review) => (
              <article key={review.id} className="rounded-[22px] border border-line bg-white/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">For {review.reviewee?.full_name ?? "SWAPA member"}</p>
                  <div className="flex items-center gap-2">
                    <Stars value={review.rating} />
                    <span className="text-xs text-ink-soft">{formatDate(review.created_at)}</span>
                  </div>
                </div>
                {review.body && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{review.body}</p>}
                <Link
                  href={`/matches/${review.match_id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sage-dark hover:text-ink"
                >
                  View exchange <ArrowRight className="size-3" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="You haven't written a review yet. After a completed swap, you can review the other person." />
        )}
      </section>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-[22px] border-2 border-dashed border-sage-dark/30 bg-white/50 p-8 text-center text-sm text-ink-soft">
      {text}
    </div>
  );
}
