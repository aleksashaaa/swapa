import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getChatSummaries } from "@/lib/data";
import { initials, timeAgo, truncate } from "@/lib/format";
import { statusLabel } from "@/lib/constants";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const session = await requireOnboarded();
  const chats = await getChatSummaries(session.supabase, session.userId);

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <p className="eyebrow">Chats</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Keep the swap <em className="italic text-sage-dark">moving.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Every match has its own conversation. Arrange a safe meeting, ask questions and confirm the
        details here.
      </p>

      {chats.length === 0 ? (
        <div className="mt-8 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/55 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
            <MessageCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 font-display text-3xl">No conversations yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Chats open automatically when you match with someone. Start in Discover.
          </p>
          <Link href="/discover" className="btn-primary mt-6 px-6 py-3">
            Find a match <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-2">
          {chats.map(({ match, other, last }) => {
            const mine = match.item_a.owner_id === session.userId ? match.item_a : match.item_b;
            const theirs = match.item_a.owner_id === session.userId ? match.item_b : match.item_a;
            const closed = match.status === "cancelled" || match.status === "completed";
            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="group flex items-center gap-4 rounded-[22px] border border-line bg-white/75 p-4 transition hover:border-sage-dark hover:bg-white"
              >
                <div className="relative">
                  <div className="grid size-12 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark">
                    {other?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold">{initials(other?.full_name)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-8 overflow-hidden rounded-lg border-2 border-cream bg-sage">
                    {theirs.item_images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={theirs.item_images[0].url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">{other?.full_name ?? "SWAPA member"}</p>
                    <span className="shrink-0 text-[11px] text-ink-soft">
                      {timeAgo(last?.created_at ?? match.created_at)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ink-soft">
                    {last
                      ? `${last.sender_id === session.userId ? "You: " : ""}${
                          last.image_url && last.body === "Photo" ? "Sent a photo" : truncate(last.body, 80)
                        }`
                      : `You matched over ${theirs.title}. Say hello.`}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-ink-soft">
                    {mine.title} ↔ {theirs.title} · {statusLabel(mine.status)}
                    {closed ? " · read-only" : ""}
                  </p>
                </div>

                <ArrowRight className="size-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-sage-dark" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
