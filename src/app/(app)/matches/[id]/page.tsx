import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMatch, otherItem, otherOwner } from "@/lib/data";
import { categoryLabel, conditionLabel } from "@/lib/constants";
import { initials } from "@/lib/format";
import { Stars } from "@/components/stars";
import { ReportDialog } from "@/components/report-dialog";
import { ChatPanel } from "./chat-panel";
import { ExchangePanel } from "./exchange-panel";
import { loadMessages } from "./actions";

export const metadata: Metadata = { title: "Match" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOnboarded();
  const match = await getMatch(session.supabase, id);
  if (!match) notFound();

  const mine = match.item_a.owner_id === session.userId ? match.item_a : match.item_b;
  const theirs = otherItem(match, session.userId);
  const other = otherOwner(match, session.userId);
  const isA = match.item_a.owner_id === session.userId;

  const [{ data: review }, { data: blocked }, chat] = await Promise.all([
    session.supabase
      .from("reviews")
      .select("id")
      .eq("match_id", id)
      .eq("reviewer_id", session.userId)
      .maybeSingle(),
    session.supabase.rpc("is_match_blocked", { p_match_id: id }),
    loadMessages(id),
  ]);

  console.log("MATCH DEBUG:", {
  matchStatus: match.status,
  blocked,
  isBlocked: Boolean(blocked),
});
const isBlocked = Boolean(blocked);
  const canMessage = !isBlocked && (match.status === "active" || match.status === "reserved");
  const disabledReason = isBlocked
    ? "Messaging is unavailable because a block is in place."
    : match.status === "completed"
      ? "This swap is complete. The conversation is now read-only."
      : match.status === "cancelled"
        ? "This conversation is closed. You can still read the history."
        : "";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-5">
      <Link href="/matches" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Matches
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Match</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.95] tracking-tight">
            You both said <em className="italic text-sage-dark">yes.</em>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            This match is tied to these two exact items. Agree on the exchange, meet safely and
            confirm when you&apos;re both done.
          </p>
        </div>
        <span className="rounded-full bg-sage/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
          {match.status === "active"
            ? "Open"
            : match.status === "reserved"
              ? "Reserved"
              : match.status === "completed"
                ? "Completed"
                : "Closed"}
        </span>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <ItemCard label="You offer" item={mine} />
        <ItemCard label={`${other?.full_name ?? "They"} offer`} item={theirs} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ChatPanel
          matchId={match.id}
          userId={session.userId}
          initialMessages={chat.messages ?? []}
          disabled={!canMessage}
          disabledReason={disabledReason}
        />

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <p className="eyebrow">Swapping with</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid size-14 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark">
                {other?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="font-semibold">{initials(other?.full_name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-2xl">{other?.full_name ?? "SWAPA member"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
                  <MapPin className="size-3.5" aria-hidden /> {other?.city || "City not set"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Stars value={Number(other?.avg_rating ?? 0)} />
              <span className="text-xs text-ink-soft">
                {other?.review_count ?? 0} review{(other?.review_count ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {other && (
                <Link href={`/users/${other.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                  View profile <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
              {other && <ReportDialog targetType="user" targetId={other.id} compact />}
            </div>
          </section>

          <ExchangePanel
            matchId={match.id}
            agreement={match.agreement ?? null}
            matchStatus={match.status}
            isA={isA}
            hasReviewed={Boolean(review)}
            otherName={other?.full_name.split(" ")[0] ?? "them"}
          />

          <section className="rounded-[24px] border border-line bg-sage/25 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-sage-dark" aria-hidden /> Swap safely
            </p>
            <ul className="mt-2 space-y-1.5 text-ink-soft">
              <li>Meet in a public place during the day.</li>
              <li>Never send money — SWAPA is free.</li>
              <li>Check the item before confirming completion.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ItemCard({
  label,
  item,
}: {
  label: string;
  item: { id: string; title: string; category: string; condition: string; item_images?: { url: string; position: number }[] };
}) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex gap-4 overflow-hidden rounded-[24px] border border-line bg-white/75 p-3 transition hover:border-sage-dark"
    >
      <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-sage sm:size-28">
        {item.item_images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-sage-dark">
            <Sparkles className="size-6" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <p className="eyebrow">{label}</p>
        <h2 className="mt-1 line-clamp-2 font-display text-2xl leading-tight">{item.title}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {categoryLabel(item.category)} · {conditionLabel(item.condition)}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sage-dark">
          View item <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
