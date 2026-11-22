import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Sparkles, Star } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getPublicProfile, getReviewsReceived, getUserItems } from "@/lib/data";
import { categoryLabel, conditionLabel } from "@/lib/constants";
import { initials } from "@/lib/format";
import { Stars } from "@/components/stars";
import { ReportDialog } from "@/components/report-dialog";
import { BlockButton } from "@/components/block-button";

export const metadata: Metadata = { title: "Member profile" };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOnboarded();
  if (id === session.userId) redirect("/profile");

  const [profile, items, reviews, { data: block }] = await Promise.all([
    getPublicProfile(session.supabase, id),
    getUserItems(session.supabase, id),
    getReviewsReceived(session.supabase, id),
    session.supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", session.userId)
      .eq("blocked_id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const blocked = Boolean(block);
  const showCity = profile.show_city ?? true;
  const showRating = profile.show_rating ?? true;

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Back
      </Link>

      <section className="mt-6 overflow-hidden rounded-[28px] border border-line bg-white/75">
        <div className="h-28 bg-sage" aria-hidden />
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="grid size-24 place-items-center overflow-hidden rounded-full border-4 border-cream bg-sage-dark text-2xl font-semibold text-white">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  initials(profile.full_name)
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl leading-tight">{profile.full_name}</h1>
                {showCity && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                    <MapPin className="size-3.5" aria-hidden /> {profile.city || "City not set"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <ReportDialog targetType="user" targetId={profile.id} compact />
              <BlockButton userId={profile.id} name={profile.full_name.split(" ")[0] ?? profile.full_name} blocked={blocked} />
            </div>
          </div>

          {blocked && (
            <p className="mt-5 rounded-xl bg-[#F7E9E2] px-4 py-3 text-sm text-[#8B3D1F]">
              You blocked this person. Their items are hidden from Discover and open matches are
              closed.
            </p>
          )}

          {profile.bio && <p className="mt-5 max-w-2xl text-ink-soft">{profile.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(profile.interests ?? []).map((interest) => (
              <span key={interest} className="badge-sage">
                {interest}
              </span>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-sage/35 p-4">
              <p className="font-display text-2xl">{profile.completed_exchanges}</p>
              <p className="mt-1 text-xs text-ink-soft">Completed swaps</p>
            </div>
            <div className="rounded-2xl bg-sage/35 p-4">
              <p className="font-display text-2xl">{profile.review_count}</p>
              <p className="mt-1 text-xs text-ink-soft">Reviews</p>
            </div>
            <div className="rounded-2xl bg-sage/35 p-4">
              <p className="flex items-center gap-1.5 font-display text-2xl">
                {showRating ? Number(profile.avg_rating).toFixed(1) : "—"}
                <Star className="size-4 fill-sage-dark text-sage-dark" aria-hidden />
              </p>
              <p className="mt-1 text-xs text-ink-soft">Rating</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Available items</p>
            <h2 className="mt-2 font-display text-3xl">On {profile.full_name.split(" ")[0]}&apos;s shelf</h2>
          </div>
        </div>
        {items.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="overflow-hidden rounded-[22px] border border-line bg-white/80 transition hover:border-sage-dark"
              >
                <div className="aspect-[4/3] bg-sage">
                  {item.item_images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-sage-dark">
                      <Sparkles className="size-7" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="eyebrow">{categoryLabel(item.category)}</p>
                  <h3 className="mt-1 line-clamp-1 font-display text-2xl">{item.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{conditionLabel(item.condition)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-sage-dark/30 bg-white/50 p-6 text-center text-sm text-ink-soft">
            No available items right now.
          </p>
        )}
      </section>

      <section className="mt-10">
        <p className="eyebrow">Reviews</p>
        <h2 className="mt-2 font-display text-3xl">What others say</h2>
        {reviews.length ? (
          <div className="mt-4 space-y-3">
            {reviews.slice(0, 10).map((review) => (
              <article key={review.id} className="rounded-[22px] border border-line bg-white/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{review.reviewer?.full_name ?? "SWAPA member"}</p>
                  <Stars value={review.rating} />
                </div>
                {review.body && <p className="mt-2 text-sm text-ink-soft">{review.body}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-sage/25 px-4 py-5 text-sm text-ink-soft">
            No reviews yet.
          </p>
        )}
      </section>
    </main>
  );
}
