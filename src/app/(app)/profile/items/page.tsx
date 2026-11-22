import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMatches, getMyItems } from "@/lib/data";
import { ItemsManager, type ManagedItem } from "./items-manager";

export const metadata: Metadata = { title: "My Items" };

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const session = await requireOnboarded();
  const { created, updated } = await searchParams;
  const [items, matches] = await Promise.all([
    getMyItems(session.supabase, session.userId),
    getMatches(session.supabase),
  ]);

  const managed: ManagedItem[] = items.map((item) => {
    const related = matches.filter(
      (m) => m.item_a.id === item.id || m.item_b.id === item.id,
    );
    const open = related.filter((m) => m.status === "active" || m.status === "reserved");
    return {
      ...item,
      matchCount: open.length,
      hasAgreedExchange: related.some((m) => m.agreement?.status === "agreed"),
    };
  });

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Profile
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My Items</p>
          <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
            Everything you&apos;re <em className="italic text-sage-dark">offering.</em>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Each item has its own photos, status and matches. Pausing one never affects another.
          </p>
        </div>
      </div>

      {created && (
        <p role="status" className="mt-6 rounded-xl border border-sage-dark/25 bg-sage/40 px-4 py-3 text-sm">
          Your item is published and available in Discover.
        </p>
      )}
      {updated && (
        <p role="status" className="mt-6 rounded-xl border border-sage-dark/25 bg-sage/40 px-4 py-3 text-sm">
          Your item was updated.
        </p>
      )}

      <div className="mt-8">
        <ItemsManager items={managed} />
      </div>
    </main>
  );
}
