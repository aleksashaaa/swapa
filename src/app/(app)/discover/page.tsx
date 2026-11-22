import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMyItems } from "@/lib/data";
import { track } from "@/lib/track";
import { DiscoverClient } from "./discover-client";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const session = await requireOnboarded();
  const { item } = await searchParams;
  const ownItems = (await getMyItems(session.supabase, session.userId)).filter(
    (i) => i.status === "available",
  );

  await track(session.supabase, session.userId, "discover_opened", {
    available_items: ownItems.length,
  });

  if (!ownItems.length) {
    return (
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.2rem)] leading-[0.95] tracking-tight">
          Your next swap starts with <em className="italic text-sage-dark">one item.</em>
        </h1>
        <div className="mt-10 rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/60 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <h2 className="mt-5 font-display text-3xl">You haven&apos;t added any items yet.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Add something you no longer use. It becomes your offering item in Discover, and someone
            nearby might have exactly what you want.
          </p>
          <Link href="/profile/items/new" className="btn-primary mt-6 px-6 py-3">
            <Plus className="size-4" aria-hidden /> Add your first item
          </Link>
        </div>
      </main>
    );
  }

  const requested = ownItems.find((i) => i.id === item);
  const initialOfferingId = requested?.id ?? ownItems[0]!.id;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Discover</p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.95] tracking-tight">
            Find your next <em className="italic text-sage-dark">favourite thing.</em>
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Choose one of your items to offer, then swipe through items in the same category.
          </p>
        </div>
        <Link href="/profile/items/new" className="btn-secondary px-4 py-2.5 text-sm">
          <Plus className="size-4" aria-hidden /> Add another item
        </Link>
      </div>
      <DiscoverClient ownItems={ownItems} initialOfferingId={initialOfferingId} />
    </main>
  );
}
