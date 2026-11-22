import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/session";
import { getMyItem } from "@/lib/data";
import { updateItem } from "../../actions";
import { ItemForm } from "../../item-form";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireOnboarded();
  const item = await getMyItem(session.supabase, session.userId, id);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <Link href="/profile/items" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> My Items
      </Link>
      <p className="eyebrow mt-6">Edit listing</p>
      <h1 className="mt-3 font-display text-[clamp(2.3rem,5vw,3.8rem)] leading-[0.95] tracking-tight">
        Keep it <em className="italic text-sage-dark">accurate.</em>
      </h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Changes apply to this item only. Other items keep their own photos, status and matches.
      </p>
      <div className="mt-8">
        <ItemForm action={updateItem} userId={session.userId} item={item} />
      </div>
    </main>
  );
}
