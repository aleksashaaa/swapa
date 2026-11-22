import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getItem } from "@/lib/data";
import { categoryLabel, conditionLabel, statusLabel, STATUS_STYLES } from "@/lib/constants";
import { initials, timeAgo } from "@/lib/format";
import { Stars } from "@/components/stars";
import { ReportDialog } from "@/components/report-dialog";

export const metadata: Metadata = { title: "Item" };

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOnboarded();
  const item = await getItem(session.supabase, id);
  if (!item) notFound();

  const owner = item.owner;
  const mine = item.owner_id === session.userId;
  const images = item.item_images ?? [];
  const showCity = owner?.show_city ?? true;
  const showRating = owner?.show_rating ?? true;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
      <Link
        href={mine ? "/profile/items" : "/discover"}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> {mine ? "My Items" : "Discover"}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          {images.length ? (
            <div className="grid gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-[26px] border border-line bg-sage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[0]!.url} alt={item.title} className="size-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(1, 5).map((image) => (
                    <div key={image.url} className="aspect-square overflow-hidden rounded-xl border border-line bg-sage">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-[26px] bg-sage text-sage-dark">
              <Sparkles className="size-14" strokeWidth={1.2} aria-hidden />
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-sage">{categoryLabel(item.category)}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>
              {statusLabel(item.status)}
            </span>
          </div>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
            {item.title}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {conditionLabel(item.condition)} · Listed {timeAgo(item.created_at)}
          </p>
          <p className="mt-5 whitespace-pre-wrap leading-relaxed text-ink-soft">{item.description}</p>

          {Object.keys(item.attributes ?? {}).length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-2">
              {Object.entries(item.attributes).map(([key, value]) =>
                value ? (
                  <div key={key} className="rounded-xl border border-line bg-white/70 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-ink-soft">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          )}

          <section className="mt-7 rounded-[22px] border border-line bg-white/75 p-4">
            <p className="eyebrow">Offered by</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid size-12 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark">
                {owner?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={owner.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{initials(owner?.full_name)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{owner?.full_name ?? "SWAPA member"}</p>
                {showCity && (
                  <p className="flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="size-3" aria-hidden /> {owner?.city || "City not set"}
                  </p>
                )}
              </div>
              {showRating && (
                <div className="text-right">
                  <Stars value={Number(owner?.avg_rating ?? 0)} />
                  <p className="text-[11px] text-ink-soft">
                    {owner?.review_count ?? 0} review{(owner?.review_count ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {mine ? (
                <Link href={`/profile/items/${item.id}/edit`} className="btn-primary px-4 py-2 text-sm">
                  <Pencil className="size-4" aria-hidden /> Edit item
                </Link>
              ) : (
                owner && (
                  <Link href={`/users/${owner.id}`} className="btn-secondary px-4 py-2 text-sm">
                    View profile <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )
              )}
              {!mine && <ReportDialog targetType="item" targetId={item.id} compact />}
            </div>
          </section>

          <div className="mt-4 rounded-2xl bg-sage/30 p-4 text-sm text-ink-soft">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="size-4 text-sage-dark" aria-hidden /> How swapping works
            </p>
            <p className="mt-1.5">
              Choose one of your own items in the same category in Discover. If you both like each
              other&apos;s item, you match and can agree on the exchange.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
