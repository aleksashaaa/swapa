import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Handshake, Sparkles, X } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMyAgreements, otherItem, otherOwner } from "@/lib/data";
import { conditionLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Match } from "@/lib/types";

export const metadata: Metadata = { title: "My Exchanges" };

export default async function ExchangesPage() {
  const session = await requireOnboarded();
  const agreements = await getMyAgreements(session.supabase);

  const active = agreements.filter((a) => a.status === "pending" || a.status === "agreed");
  const completed = agreements.filter((a) => a.status === "completed");
  const cancelled = agreements.filter((a) => a.status === "cancelled");

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Profile
      </Link>
      <p className="eyebrow mt-6">My Exchanges</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Agreements, not <em className="italic text-sage-dark">guesses.</em>
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        An exchange is only reserved once both people agree. Both must confirm completion before the
        swap is final.
      </p>

      {agreements.length === 0 ? (
        <div className="mt-8 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/55 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
            <Handshake className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 font-display text-3xl">No exchanges yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Open a match and agree to swap. Your agreements and their history appear here.
          </p>
          <Link href="/matches" className="btn-primary mt-6 px-6 py-3">
            View matches <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <Group title="Active" count={active.length} icon={<Clock className="size-4" aria-hidden />}>
            {active.length ? (
              active.map((agreement) => (
                <ExchangeCard key={agreement.id} agreement={agreement} userId={session.userId} />
              ))
            ) : (
              <p className="rounded-2xl bg-white/55 px-4 py-5 text-sm text-ink-soft">
                No active agreements right now.
              </p>
            )}
          </Group>

          <Group title="Completed" count={completed.length} icon={<CheckCircle2 className="size-4" aria-hidden />}>
            {completed.length ? (
              completed.map((agreement) => (
                <ExchangeCard key={agreement.id} agreement={agreement} userId={session.userId} />
              ))
            ) : (
              <p className="rounded-2xl bg-white/55 px-4 py-5 text-sm text-ink-soft">
                Completed swaps will appear here.
              </p>
            )}
          </Group>

          {cancelled.length > 0 && (
            <Group title="Cancelled" count={cancelled.length} icon={<X className="size-4" aria-hidden />}>
              {cancelled.map((agreement) => (
                <ExchangeCard key={agreement.id} agreement={agreement} userId={session.userId} />
              ))}
            </Group>
          )}
        </div>
      )}
    </main>
  );
}

function Group({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-sage text-sage-dark">{icon}</span>
        <h2 className="font-display text-3xl">{title}</h2>
        <span className="rounded-full bg-sage/50 px-2 py-0.5 text-xs font-semibold">{count}</span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ExchangeCard({
  agreement,
  userId,
}: {
  agreement: { id: string; status: string; match: Match };
  userId: string;
}) {
  const match = agreement.match;
  const mine = match.item_a.owner_id === userId ? match.item_a : match.item_b;
  const theirs = otherItem(match, userId);
  const other = otherOwner(match, userId);

  const label =
    agreement.status === "agreed"
      ? "Reserved · waiting for completion"
      : agreement.status === "pending"
        ? "Waiting for both to agree"
        : agreement.status === "completed"
          ? "Completed"
          : "Cancelled";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group flex flex-wrap items-center gap-4 rounded-[22px] border border-line bg-white/75 p-4 transition hover:border-sage-dark hover:bg-white"
    >
      <div className="flex -space-x-3">
        {[mine, theirs].map((item) => (
          <div key={item.id} className="size-16 overflow-hidden rounded-xl border-4 border-cream bg-sage">
            {item.item_images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-sage-dark">
                <Sparkles className="size-4" aria-hidden />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-tight">
          {mine.title} <span className="text-ink-soft">↔</span> {theirs.title}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          with {other?.full_name ?? "SWAPA member"} · {conditionLabel(theirs.condition)}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {label}
          {agreement.status === "completed" && " · review the exchange"}
          {agreement.status === "cancelled" && " · items returned to Available"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-ink-soft">{formatDate(match.created_at)}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-sage-dark">
          Open <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
