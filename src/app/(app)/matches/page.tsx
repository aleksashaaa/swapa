import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMatches, otherItem, otherOwner } from "@/lib/data";
import { conditionLabel, statusLabel } from "@/lib/constants";
import { initials, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Matches" };

type Filter = "all" | "open" | "completed" | "closed";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; item?: string }>;
}) {
  const session = await requireOnboarded();
  const { filter: rawFilter, item } = await searchParams;
  const filter: Filter = ["all", "open", "completed", "closed"].includes(rawFilter ?? "")
    ? (rawFilter as Filter)
    : "all";

  const all = await getMatches(session.supabase);
  const scoped = item ? all.filter((m) => m.item_a.id === item || m.item_b.id === item) : all;
  const matches = scoped.filter((m) => {
    if (filter === "open") return m.status === "active" || m.status === "reserved";
    if (filter === "completed") return m.status === "completed";
    if (filter === "closed") return m.status === "cancelled";
    return true;
  });

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: scoped.length },
    {
      value: "open",
      label: "Open",
      count: scoped.filter((m) => m.status === "active" || m.status === "reserved").length,
    },
    { value: "completed", label: "Completed", count: scoped.filter((m) => m.status === "completed").length },
    { value: "closed", label: "Closed", count: scoped.filter((m) => m.status === "cancelled").length },
  ];

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Matches</p>
          <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
            Mutual likes, <em className="italic text-sage-dark">real swaps.</em>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Each match is a specific pair of items. One item can have several open matches — but only
            one agreed exchange at a time.
          </p>
        </div>
        {item && (
          <Link href="/matches" className="btn-secondary px-4 py-2 text-sm">
            Clear item filter
          </Link>
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const params = new URLSearchParams();
          if (tab.value !== "all") params.set("filter", tab.value);
          if (item) params.set("item", item);
          const href = params.toString() ? `/matches?${params.toString()}` : "/matches";
          return (
            <Link
              key={tab.value}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === tab.value
                  ? "border-sage-dark bg-sage-dark text-white"
                  : "border-line bg-white/70 text-ink-soft hover:border-sage-dark hover:text-ink"
              }`}
            >
              {tab.label}
              <span className={filter === tab.value ? "text-white/70" : "text-ink-soft"}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <div className="mt-8 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/55 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
            <Heart className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 font-display text-3xl">
            {scoped.length ? "No matches in this view." : "No matches yet."}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            {scoped.length
              ? "Try another filter. Matches stay here as long as the items and conversation exist."
              : "When you and another person both like each other's item in the same category, your match appears here."}
          </p>
          <Link href="/discover" className="btn-primary mt-6 px-6 py-3">
            Go to Discover <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {matches.map((match) => {
            const other = otherOwner(match, session.userId);
            const theirs = otherItem(match, session.userId);
            const mine = match.item_a.owner_id === session.userId ? match.item_a : match.item_b;
            const agreement = match.agreement;
            const statusText =
              agreement?.status === "completed"
                ? "Swap completed"
                : agreement?.status === "agreed"
                  ? "Exchange agreed"
                  : agreement?.status === "pending"
                    ? "Agreement pending"
                    : match.status === "active"
                      ? "New match"
                      : match.status === "reserved"
                        ? "Reserved"
                        : "Closed";

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="group flex flex-wrap items-center gap-4 rounded-[24px] border border-line bg-white/75 p-4 transition hover:border-sage-dark hover:bg-white"
              >
                <div className="flex -space-x-4">
                  {[mine, theirs].map((item, index) => (
                    <div
                      key={item.id}
                      className={`size-20 overflow-hidden rounded-2xl border-4 border-cream bg-sage ${index === 0 ? "rotate-[-3deg]" : "rotate-[3deg]"}`}
                    >
                      {item.item_images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-sage-dark">
                          <Sparkles className="size-5" aria-hidden />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-2xl leading-tight">{theirs.title}</p>
                    <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-[11px] font-semibold">
                      {statusText}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    for your {mine.title} · {conditionLabel(theirs.condition)} · {timeAgo(match.created_at)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                    <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-sage text-[9px] font-semibold text-sage-dark">
                      {other?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={other.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        initials(other?.full_name)
                      )}
                    </span>
                    {other?.full_name ?? "SWAPA member"} · {statusLabel(mine.status)}
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-graphite transition group-hover:bg-sage-dark group-hover:text-white">
                  Open <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
