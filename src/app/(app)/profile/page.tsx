import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Heart,
  MapPin,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMatches, getMyItems, getReviewsReceived } from "@/lib/data";
import { Stars } from "@/components/stars";
import { initials } from "@/lib/format";
import { categoryLabel, statusLabel, STATUS_STYLES } from "@/lib/constants";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireOnboarded();
  const { saved } = await searchParams;
  const [{ data: profile }, items, matches, reviews] = await Promise.all([
    session.supabase
      .from("profiles")
      .select("id, full_name, avatar_url, city, bio, interests, completed_exchanges, avg_rating, review_count, show_city, show_rating, created_at")
      .eq("id", session.userId)
      .single(),
    getMyItems(session.supabase, session.userId),
    getMatches(session.supabase),
    getReviewsReceived(session.supabase, session.userId),
  ]);

  const available = items.filter((i) => i.status === "available");
  const completed = items.filter((i) => i.status === "completed");
  const activeMatches = matches.filter((m) => m.status === "active" || m.status === "reserved");

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
      {saved && (
        <p role="status" className="mb-5 rounded-xl border border-sage-dark/25 bg-sage/40 px-4 py-3 text-sm">
          Profile saved.
        </p>
      )}

      <section className="overflow-hidden rounded-[28px] border border-line bg-white/75">
        <div className="h-28 bg-sage" aria-hidden />
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="grid size-24 place-items-center overflow-hidden rounded-full border-4 border-cream bg-sage-dark text-2xl font-semibold text-white">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  initials(profile?.full_name ?? session.fullName)
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl leading-tight">{profile?.full_name ?? session.fullName}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                  <MapPin className="size-3.5" aria-hidden /> {profile?.city || "City not set"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Link href={`/users/${session.userId}`} className="btn-secondary px-4 py-2 text-sm">
                <User className="size-4" aria-hidden /> Public view
              </Link>
              <Link href="/profile/edit" className="btn-primary px-4 py-2 text-sm">
                <Pencil className="size-4" aria-hidden /> Edit profile
              </Link>
            </div>
          </div>

          {profile?.bio && <p className="mt-5 max-w-2xl text-ink-soft">{profile.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(profile?.interests ?? []).map((interest: string) => (
              <span key={interest} className="badge-sage">
                {interest}
              </span>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={String(profile?.completed_exchanges ?? 0)} label="Completed swaps" />
            <Stat value={String(activeMatches.length)} label="Open matches" />
            <Stat value={String(profile?.review_count ?? 0)} label="Reviews" />
            <div className="rounded-2xl bg-sage/35 p-4">
              <div className="flex items-center gap-1.5">
                <p className="font-display text-2xl">{Number(profile?.avg_rating ?? 0).toFixed(1)}</p>
                <Star className="size-4 fill-sage-dark text-sage-dark" aria-hidden />
              </div>
              <p className="mt-1 text-xs text-ink-soft">Average rating</p>
              <div className="mt-1">
                <Stars value={Number(profile?.avg_rating ?? 0)} size="size-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/profile/items", title: "My Items", body: `${items.length} listed`, Icon: Sparkles },
          { href: "/profile/exchanges", title: "My Exchanges", body: "Agreements & history", Icon: Heart },
          { href: "/profile/reviews", title: "Reviews", body: `${reviews.length} received`, Icon: Star },
          { href: "/settings", title: "Settings", body: "Notifications, privacy & safety", Icon: Settings },
        ].map(({ href, title, body, Icon }) => (
          <Link key={href} href={href} className="group rounded-[22px] border border-line bg-white/70 p-5 transition hover:border-sage-dark hover:bg-sage/20">
            <span className="grid size-10 place-items-center rounded-full bg-sage text-sage-dark">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sage-dark">
              Open <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your shelf</p>
            <h2 className="mt-2 font-display text-3xl">Recent items</h2>
          </div>
          <Link href="/profile/items" className="text-sm font-medium text-sage-dark hover:text-ink">
            View all
          </Link>
        </div>
        {items.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 3).map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="overflow-hidden rounded-[22px] border border-line bg-white/80 transition hover:border-sage-dark">
                <div className="aspect-[4/3] bg-sage">
                  {item.item_images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-sage-dark">
                      <BookOpen className="size-8" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="eyebrow">{categoryLabel(item.category)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[item.status]}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <h3 className="mt-1 line-clamp-1 font-display text-2xl">{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border-2 border-dashed border-sage-dark/30 p-8 text-center">
            <p className="text-ink-soft">No items yet. Add something you&apos;d like to swap.</p>
            <Link href="/profile/items/new" className="btn-primary mt-4 px-5 py-2.5 text-sm">
              Add your first item
            </Link>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="font-display text-3xl">{available.length}</p>
          <p className="text-sm text-ink-soft">Available to swap</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="font-display text-3xl">{completed.length}</p>
          <p className="text-sm text-ink-soft">Completed items</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-5">
          <p className="flex items-center gap-2 font-display text-3xl">
            <ShieldCheck className="size-5 text-sage-dark" aria-hidden /> Free
          </p>
          <p className="text-sm text-ink-soft">No fees, ever</p>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-sage/35 p-4">
      <p className="font-display text-2xl">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{label}</p>
    </div>
  );
}
