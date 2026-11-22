"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Heart,
  Home as HomeIcon,
  Info,
  MapPin,
  Plus,
  Shirt,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { fetchFeed, recordSwipe, type FeedItem, type SwipeMatch } from "./actions";
import type { Item } from "@/lib/types";
import {
  CATEGORY_LABELS,
  CATEGORY_TAGLINES,
  categoryLabel,
  conditionLabel,
  type Category,
} from "@/lib/constants";
import { initials } from "@/lib/format";

const SWIPE_AT = 100;
const CATEGORY_ICONS = { clothing: Shirt, books: BookOpen, home: HomeIcon } as const;
const CATEGORIES: Category[] = ["clothing", "books", "home"];

type Toast = { text: string; href?: string; cta?: string };

function imageOf(item: Item | FeedItem) {
  if ("images" in item) return item.images?.[0]?.url ?? null;
  return item.item_images?.[0]?.url ?? null;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${n <= Math.round(value) ? "fill-sage-dark text-sage-dark" : "text-line"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function DiscoverClient({
  ownItems,
  initialOfferingId,
}: {
  ownItems: Item[];
  initialOfferingId: string;
}) {
  const [category, setCategory] = useState<Category>(
    (ownItems.find((i) => i.id === initialOfferingId)?.category ?? "clothing") as Category,
  );
  const [offeringId, setOfferingId] = useState(initialOfferingId);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [details, setDetails] = useState<FeedItem | null>(null);
  const [match, setMatch] = useState<{ info: SwipeMatch; own: Item; target: FeedItem } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const request = useRef(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const offeringOptions = ownItems.filter((i) => i.category === category && i.status === "available");
  const offering = ownItems.find((i) => i.id === offeringId) ?? null;
  const current = feed[0];

  const loadFeed = useCallback(async (id: string) => {
    if (!id) {
      setFeed([]);
      setLoading(false);
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError(null);
    const result = await fetchFeed(id);
    if (token !== request.current) return;
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setFeed([]);
    } else {
      setFeed(result.items ?? []);
    }
  }, []);

  useEffect(() => {
    void loadFeed(offeringId);
  }, [offeringId, loadFeed]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const changeCategory = (next: Category) => {
    setCategory(next);
    const first = ownItems.find((i) => i.category === next && i.status === "available");
    setOfferingId(first?.id ?? "");
    setFeed([]);
  };

  const act = useCallback(
    (action: "like" | "skip") => {
      if (!current || !offering || leaving) return;
      setError(null);
      setLeaving(action === "like" ? "right" : "left");
      const target = current;
      const own = offering;

      window.setTimeout(async () => {
        const result = await recordSwipe(own.id, target.id, action);
        setLeaving(null);
        if (result.error) {
          setError(result.error);
          return;
        }
        setFeed((items) => items.filter((item) => item.id !== target.id));
        if (result.match) {
          setMatch({ info: result.match, own, target });
        } else if (action === "like") {
          setToast({ text: "Liked. If they like your item too, it's a Match." });
        } else {
          setToast({ text: "Skipped. It may reappear later." });
        }
      }, 240);
    },
    [current, leaving, offering],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (match || details || event.repeat || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") act("skip");
      if (event.key === "ArrowRight") act("like");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, match, details]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (leaving || match || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = start.current;
    if (!point || point.id !== event.pointerId) return;
    setDrag({ dx: event.clientX - point.x, dy: (event.clientY - point.y) * 0.2 });
  };
  const onPointerEnd = () => {
    const dx = drag?.dx ?? 0;
    start.current = null;
    setDrag(null);
    if (dx > SWIPE_AT) act("like");
    else if (dx < -SWIPE_AT) act("skip");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((value) => {
            const Icon = CATEGORY_ICONS[value];
            const active = category === value;
            const count = ownItems.filter((i) => i.category === value && i.status === "available").length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => changeCategory(value)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-sage-dark bg-sage-dark text-white"
                    : "border-line bg-white/70 hover:border-sage-dark"
                }`}
              >
                <span className="flex items-center justify-between">
                  <Icon className="size-5" aria-hidden />
                  <span className={`text-xs ${active ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
                </span>
                <span className="mt-2 block text-sm font-semibold">{CATEGORY_LABELS[value]}</span>
                <span className={`mt-0.5 block text-[11px] ${active ? "text-white/60" : "text-ink-soft"}`}>
                  {CATEGORY_TAGLINES[value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Offering selector */}
        <div className="mt-5 rounded-2xl border border-line bg-white/65 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">You are offering</p>
              <p className="mt-1 text-sm text-ink-soft">
                Choose one of your {CATEGORY_LABELS[category].toLowerCase()} items.
              </p>
            </div>
            <Link href="/profile/items/new" className="inline-flex items-center gap-1 text-sm font-medium text-sage-dark hover:text-ink">
              <Plus className="size-4" aria-hidden /> Add item
            </Link>
          </div>

          {offeringOptions.length ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-sage">
                {offering?.item_images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offering.item_images[0].url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-sage-dark">
                    <Sparkles className="size-5" aria-hidden />
                  </div>
                )}
              </div>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Select an item to offer</span>
                <select
                  value={offeringId}
                  onChange={(e) => setOfferingId(e.target.value)}
                  className="field appearance-none pr-9 text-sm font-medium"
                >
                  {offeringOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              </label>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-sage-dark/40 bg-sage/20 p-4 text-sm">
              <p className="font-medium">No available {CATEGORY_LABELS[category].toLowerCase()} items yet.</p>
              <p className="mt-1 text-ink-soft">Add one to start discovering in this category.</p>
              <Link href="/profile/items/new" className="btn-primary mt-3 px-4 py-2 text-sm">
                Add your first item <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>

        {/* Deck */}
        <div className="mt-5">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton aspect-[4/3] w-full rounded-[26px]" />
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ) : !offeringId ? (
            <EmptyState
              title="Choose an item to offer"
              body="You need at least one available item in this category before you can start swiping."
              href="/profile/items/new"
              cta="Add an item"
            />
          ) : !current ? (
            <EmptyState
              title="No items to discover right now."
              body="Check back later, switch category, or add another item to your profile."
              href="/profile/items"
              cta="Manage my items"
            />
          ) : (
            <>
              <div className="relative">
                {feed[1] && (
                  <div aria-hidden className="pointer-events-none absolute inset-x-4 top-3 scale-[0.97] opacity-45">
                    <FeedCard item={feed[1]} muted />
                  </div>
                )}
                <div
                  key={current.id}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerEnd}
                  onPointerCancel={onPointerEnd}
                  style={
                    drag
                      ? { transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)`, transition: "none" }
                      : undefined
                  }
                  className={`relative touch-pan-y select-none transition duration-300 ease-out ${
                    leaving === "right"
                      ? "translate-x-[120%] rotate-12 opacity-0"
                      : leaving === "left"
                        ? "-translate-x-[120%] -rotate-12 opacity-0"
                        : "cursor-grab active:cursor-grabbing"
                  }`}
                >
                  <FeedCard item={current} />
                  {drag && (
                    <>
                      <span
                        aria-hidden
                        style={{ opacity: Math.min(1, Math.max(0, drag.dx / SWIPE_AT)) }}
                        className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-xl border-4 border-sage-dark bg-cream/90 px-4 py-1 font-display text-3xl font-semibold italic text-sage-dark"
                      >
                        Like
                      </span>
                      <span
                        aria-hidden
                        style={{ opacity: Math.min(1, Math.max(0, -drag.dx / SWIPE_AT)) }}
                        className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-xl border-4 border-ink-soft bg-cream/90 px-4 py-1 font-display text-3xl font-semibold italic text-ink-soft"
                      >
                        Skip
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => act("skip")}
                  disabled={Boolean(leaving)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white/80 px-3 py-4 font-medium transition hover:border-ink-soft disabled:opacity-50"
                >
                  <X className="size-6" aria-hidden /> Skip
                </button>
                <button
                  type="button"
                  onClick={() => setDetails(current)}
                  disabled={Boolean(leaving)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white/80 px-3 py-4 font-medium transition hover:border-sage-dark disabled:opacity-50"
                >
                  <Info className="size-6" aria-hidden /> View Details
                </button>
                <button
                  type="button"
                  onClick={() => act("like")}
                  disabled={Boolean(leaving)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-sage-dark px-3 py-4 font-medium text-white transition hover:bg-graphite disabled:opacity-50"
                >
                  <Heart className="size-6" aria-hidden /> Like
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-ink-soft">
                Drag the card or use the arrow keys. Like = right, Skip = left.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#F7E9E2] px-4 py-3 text-center text-sm text-[#8B3D1F]">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <p className="eyebrow">How Discover works</p>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li className="flex gap-2">
              <Heart className="mt-0.5 size-4 shrink-0 text-sage-dark" aria-hidden />
              Like an item you would happily swap for.
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
              Skip anything that isn&apos;t right. Skipped items can return later.
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-sage-dark" aria-hidden />
              A Match happens when you both like each other&apos;s item.
            </li>
          </ul>
          <p className="mt-4 rounded-xl bg-sage/35 p-3 text-xs leading-relaxed text-ink-soft">
            Items are shown without owner details until you match. This keeps Discover about the
            things, not the profiles.
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Selected item</p>
          {offering ? (
            <div className="mt-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-sage">
                {offering.item_images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offering.item_images[0].url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-sage-dark">
                    <Sparkles className="size-7" aria-hidden />
                  </div>
                )}
              </div>
              <p className="mt-3 font-display text-xl">{offering.title}</p>
              <p className="text-sm text-ink-soft">
                {conditionLabel(offering.condition)} · {categoryLabel(offering.category)}
              </p>
              <Link href={`/profile/items/${offering.id}/edit`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sage-dark hover:text-ink">
                Edit this item <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Pick an item above to begin.</p>
          )}
        </div>
      </aside>

      {details && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/60 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-cream p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{categoryLabel(details.category)}</p>
                <h2 className="mt-2 font-display text-3xl">{details.title}</h2>
              </div>
              <button onClick={() => setDetails(null)} className="grid size-9 place-items-center rounded-full border border-line bg-white" aria-label="Close details">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {details.images[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={details.images[0].url} alt="" className="mt-4 aspect-[4/3] w-full rounded-2xl object-cover" />
            )}
            <p className="mt-4 text-ink-soft">{details.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge-sage">{conditionLabel(details.condition)}</span>
              {Object.entries(details.attributes).map(([key, value]) =>
                value ? (
                  <span key={key} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs">
                    {key.replaceAll("_", " ")}: {value}
                  </span>
                ) : null,
              )}
            </div>
            <p className="mt-4 text-xs text-ink-soft">Owner details unlock after a Match.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => { setDetails(null); act("skip"); }} className="btn-secondary">
                <X className="size-4" aria-hidden /> Skip
              </button>
              <button onClick={() => { setDetails(null); act("like"); }} className="btn-primary">
                <Heart className="size-4" aria-hidden /> Like
              </button>
            </div>
          </div>
        </div>
      )}

      {match && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] bg-cream p-7 text-center shadow-2xl">
            <p className="eyebrow">New match</p>
            <p className="match-stamp mx-auto mt-4 inline-block rounded-xl border-4 border-sage-dark px-5 py-2 font-display text-4xl font-semibold italic text-sage-dark">
              It&apos;s a Match
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-left">
              {[match.own, match.target].map((item, index) => (
                <div key={`${item.id}-${index}`} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="aspect-square bg-sage">
                    {imageOf(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageOf(item) ?? ""} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-sage-dark">
                        <Sparkles className="size-7" aria-hidden />
                      </div>
                    )}
                  </div>
                  <p className="p-3 text-sm font-medium">{item.title}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="grid size-12 place-items-center overflow-hidden rounded-full bg-sage">
                {match.info.owner.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.info.owner.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-sage-dark">{initials(match.info.owner.full_name)}</span>
                )}
              </div>
              <div className="text-left">
                <p className="font-medium">{match.info.owner.full_name}</p>
                <p className="flex items-center gap-1 text-xs text-ink-soft">
                  <MapPin className="size-3" aria-hidden /> {match.info.owner.city || "City not set"}
                </p>
              </div>
              <div className="ml-2 text-left">
                <Stars value={Number(match.info.owner.avg_rating ?? 0)} />
                <p className="text-xs text-ink-soft">
                  {match.info.owner.review_count} review{match.info.owner.review_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              You both want to swap. Open the conversation to agree on the details.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/matches/${match.info.id}`} className="btn-primary px-6 py-3">
                Open Match <ArrowRight className="size-4" aria-hidden />
              </Link>
              <button onClick={() => setMatch(null)} className="btn-secondary px-6 py-3">
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="rise fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-graphite px-5 py-3 text-sm text-cream shadow-xl md:bottom-8">
          {toast.text}
          {toast.href && (
            <Link href={toast.href} className="font-medium text-sage underline-offset-4 hover:underline">
              {toast.cta}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FeedCard({ item, muted = false }: { item: FeedItem; muted?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_26px_60px_-32px_rgba(48,58,50,0.45)] ${muted ? "pointer-events-none" : ""}`}>
      <div className="relative aspect-[4/3] bg-sage">
        {item.images[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0].url} alt={item.title} className="size-full object-cover" draggable={false} />
        ) : (
          <div className="grid size-full place-items-center text-sage-dark">
            <Sparkles className="size-14" strokeWidth={1.2} aria-hidden />
          </div>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-graphite">
            {conditionLabel(item.condition)}
          </span>
          <span className="rounded-full bg-graphite/80 px-3 py-1 text-xs font-medium text-cream">
            {categoryLabel(item.category)}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.7rem)] leading-none">{item.title}</h2>
        <p className="mt-3 line-clamp-3 text-ink-soft">{item.description}</p>
        {Object.keys(item.attributes).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(item.attributes).slice(0, 4).map(([key, value]) =>
              value ? (
                <span key={key} className="rounded-full bg-sage/45 px-2.5 py-1 text-xs">
                  {value}
                </span>
              ) : null,
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-ink-soft">Owner details unlock after a Match.</p>
      </div>
    </article>
  );
}

function EmptyState({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/50 p-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
        <Sparkles className="size-6" aria-hidden />
      </div>
      <h2 className="mt-5 font-display text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">{body}</p>
      <Link href={href} className="btn-primary mt-6 px-5 py-3">
        {cta} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
