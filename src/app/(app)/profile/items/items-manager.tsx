"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Grid2X2,
  Heart,
  List,
  Pause,
  Pencil,
  Play,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { categoryLabel, conditionLabel, statusLabel, STATUS_STYLES, type ItemStatus } from "@/lib/constants";
import type { Item } from "@/lib/types";
import { deleteItem, setItemStatus } from "./actions";

export type ManagedItem = Item & { matchCount: number; hasAgreedExchange: boolean };

export function ItemsManager({ items }: { items: ManagedItem[] }) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [confirm, setConfirm] = useState<ManagedItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleStatus = (item: ManagedItem) => {
    setError(null);
    const next: "paused" | "available" = item.status === "paused" ? "available" : "paused";
    startTransition(async () => {
      const result = await setItemStatus(item.id, next);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const remove = () => {
    if (!confirm) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteItem(confirm.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirm(null);
      router.refresh();
    });
  };

  if (!items.length) {
    return (
      <div className="rounded-[26px] border-2 border-dashed border-sage-dark/35 bg-white/60 p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-sage-dark">
          <Sparkles className="size-6" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-3xl">You haven&apos;t added any items yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Add your first item and it will appear in Discover for people in your category.
        </p>
        <Link href="/profile/items/new" className="btn-primary mt-6 px-6 py-3">
          Add your first item <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              view === "grid" ? "bg-sage-dark text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Grid2X2 className="size-4" aria-hidden /> Grid
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              view === "list" ? "bg-sage-dark text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            <List className="size-4" aria-hidden /> List
          </button>
        </div>
        <Link href="/profile/items/new" className="btn-primary px-4 py-2.5 text-sm">
          Add item
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-[#F7E9E2] px-4 py-3 text-sm text-[#8B3D1F]">
          {error}
        </p>
      )}

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[22px] border border-line bg-white/80">
              <div className="relative aspect-[4/3] bg-sage">
                {item.item_images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.item_images[0].url} alt={item.title} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-sage-dark">
                    <Sparkles className="size-8" aria-hidden />
                  </div>
                )}
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="p-4">
                <p className="eyebrow">{categoryLabel(item.category)}</p>
                <h3 className="mt-1 line-clamp-1 font-display text-2xl">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {conditionLabel(item.condition)}
                  {item.matchCount > 0 ? ` · ${item.matchCount} match${item.matchCount === 1 ? "" : "es"}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/profile/items/${item.id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Link>
                  {item.status === "paused" ? (
                    <button onClick={() => toggleStatus(item)} disabled={pending} className="btn-secondary px-3 py-1.5 text-xs">
                      <Play className="size-3.5" aria-hidden /> Activate
                    </button>
                  ) : (
                    <button onClick={() => toggleStatus(item)} disabled={pending || item.status !== "available"} className="btn-secondary px-3 py-1.5 text-xs">
                      <Pause className="size-3.5" aria-hidden /> Pause
                    </button>
                  )}
                  {item.matchCount > 0 && (
                    <Link href={`/matches?item=${item.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                      <Heart className="size-3.5" aria-hidden /> Matches
                    </Link>
                  )}
                  <button onClick={() => setConfirm(item)} disabled={pending} className="rounded-full border border-line px-3 py-1.5 text-xs text-[#8B3D1F] transition hover:border-[#C98B72] hover:bg-[#F7E9E2]">
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-line bg-white/80">
          {items.map((item) => (
            <article key={item.id} className="flex flex-wrap items-center gap-4 border-b border-line p-4 last:border-0">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sage">
                {item.item_images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.item_images[0].url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-sage-dark">
                    <Sparkles className="size-5" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-2xl">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[item.status as ItemStatus]}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {categoryLabel(item.category)} · {conditionLabel(item.condition)}
                  {item.matchCount > 0 ? ` · ${item.matchCount} match${item.matchCount === 1 ? "" : "es"}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/profile/items/${item.id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Link>
                {item.status === "paused" ? (
                  <button onClick={() => toggleStatus(item)} disabled={pending} className="btn-secondary px-3 py-1.5 text-xs">
                    <Play className="size-3.5" aria-hidden /> Activate
                  </button>
                ) : (
                  <button onClick={() => toggleStatus(item)} disabled={pending || item.status !== "available"} className="btn-secondary px-3 py-1.5 text-xs">
                    <Pause className="size-3.5" aria-hidden /> Pause
                  </button>
                )}
                {item.matchCount > 0 && (
                  <Link href={`/matches?item=${item.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                    <Heart className="size-3.5" aria-hidden /> Matches
                  </Link>
                )}
                <button onClick={() => setConfirm(item)} disabled={pending} className="rounded-full border border-line px-3 py-1.5 text-xs text-[#8B3D1F] transition hover:border-[#C98B72] hover:bg-[#F7E9E2]">
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-graphite/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] bg-cream p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl">Delete “{confirm.title}”?</h2>
              <button onClick={() => setConfirm(null)} className="grid size-9 place-items-center rounded-full border border-line bg-white" aria-label="Close">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-ink-soft">
              <p>
                This item will be removed from Discover. Active Match relationships involving it will
                be closed safely.
              </p>
              {confirm.matchCount > 0 && (
                <p className="rounded-xl bg-sage/35 p-3">
                  This item has {confirm.matchCount} active match{confirm.matchCount === 1 ? "" : "es"}.
                  Conversations stay in your history, but no new messages can be sent through those
                  matches.
                </p>
              )}
              {confirm.hasAgreedExchange && (
                <p className="rounded-xl bg-[#F7E9E2] p-3 text-[#8B3D1F]">
                  This item is part of an agreed exchange. Cancel the exchange first — deleting now
                  would break the reservation.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirm(null)} className="btn-secondary px-5 py-2.5">
                Keep item
              </button>
              <button
                onClick={remove}
                disabled={pending || confirm.hasAgreedExchange}
                className="rounded-full bg-[#8B3D1F] px-5 py-2.5 font-semibold text-white transition hover:bg-[#6F2F17] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
