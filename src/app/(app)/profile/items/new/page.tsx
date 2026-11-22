import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { createItem } from "../actions";
import { ItemForm } from "../item-form";

export const metadata: Metadata = { title: "Add an item" };

export default async function NewItemPage() {
  const session = await requireOnboarded();
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <Link href="/profile/items" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> My Items
      </Link>
      <p className="eyebrow mt-6">New listing</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Add something <em className="italic text-sage-dark">worth swapping.</em>
      </h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Create one item at a time. You can add as many items as you like, across all three
        categories.
      </p>
      <div className="mt-8">
        <ItemForm action={createItem} userId={session.userId} />
      </div>
    </main>
  );
}
