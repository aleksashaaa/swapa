"use client";

import { useActionState, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  MAX_IMAGE_MB,
  MAX_ITEM_IMAGES,
  OPTIONAL_ATTRIBUTES,
  type Category,
} from "@/lib/constants";
import { extensionFor, uploadImage } from "@/lib/upload";
import type { Item } from "@/lib/types";
import type { ItemState } from "./actions";

export function ItemForm({
  action,
  userId,
  item,
}: {
  action: (prev: ItemState, formData: FormData) => Promise<ItemState>;
  userId: string;
  item?: Item;
}) {
  const [state, formAction, pending] = useActionState<ItemState, FormData>(action, {});
  const [category, setCategory] = useState<Category>(item?.category ?? "clothing");
  const [images, setImages] = useState<string[]>(
    [...(item?.item_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url),
  );
  const [attributes, setAttributes] = useState<Record<string, string>>(item?.attributes ?? {});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    const remaining = MAX_ITEM_IMAGES - images.length;
    const selected = Array.from(files).slice(0, remaining);
    const next = [...images];
    try {
      for (const file of selected) {
        const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
        const url = await uploadImage({ bucket: "item-images", path, file, maxMb: MAX_IMAGE_MB });
        next.push(url);
      }
      setImages(next);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {item && <input type="hidden" name="item_id" value={item.id} />}
      {images.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-2xl">The basics</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Clear photos and an honest description help the right person find your item.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Category</span>
            <select
              name="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as Category);
                setAttributes({});
              }}
              className="field mt-2"
              required
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">Condition</span>
            <select
              name="condition"
              defaultValue={item?.condition ?? "good"}
              className="field mt-2"
              required
            >
              {CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {CONDITION_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="eyebrow">Title</span>
            <input
              name="title"
              defaultValue={item?.title ?? ""}
              className="field mt-2"
              maxLength={80}
              required
              placeholder="Linen overshirt, design book, ceramic vase…"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="eyebrow">Description</span>
            <textarea
              name="description"
              defaultValue={item?.description ?? ""}
              className="field mt-2 min-h-36 resize-y"
              minLength={10}
              maxLength={1000}
              required
              placeholder="What is it, how does it fit or work, and why are you ready to swap it?"
            />
            <span className="mt-1.5 block text-xs text-ink-soft">10–1000 characters.</span>
          </label>
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Photos</h2>
            <p className="mt-1 text-sm text-ink-soft">
              1–{MAX_ITEM_IMAGES} images. JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB each.
            </p>
          </div>
          <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            Add photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading || images.length >= MAX_ITEM_IMAGES}
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
        </div>
        {uploadError && <p className="mt-3 text-sm text-[#8B3D1F]">{uploadError}</p>}
        {images.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, index) => (
              <div key={url} className="group relative overflow-hidden rounded-2xl border border-line bg-sage">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Item photo ${index + 1}`} className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x !== url))}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-cream/95 text-ink shadow transition hover:bg-white"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-sage-dark/30 p-8 text-center text-sm text-ink-soft">
            No photos yet. Add at least one clear photo.
          </div>
        )}
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-2xl">Details <span className="text-base text-ink-soft">· optional</span></h2>
        <p className="mt-1 text-sm text-ink-soft">These help people understand the item, but none are required.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {OPTIONAL_ATTRIBUTES[category].map((field) => (
            <label key={field.key} className="block">
              <span className="eyebrow">{field.label}</span>
              <input
                name={`attr_${field.key}`}
                value={attributes[field.key] ?? ""}
                onChange={(e) => setAttributes((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="field mt-2"
                maxLength={120}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-sage/25 p-5">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" required className="mt-1 size-4 accent-[#718A75]" />
          <span>
            I confirm this is a legal, allowed item and that I own it. I will not list dangerous,
            illegal, counterfeit or prohibited items.
          </span>
        </label>
      </section>

      <div className="sticky bottom-4 space-y-3">
        <FormAlert error={state.error} />
        <button type="submit" disabled={pending || uploading || images.length === 0} className="btn-primary w-full py-4 text-lg">
          {pending ? "Saving…" : item ? "Save changes" : "Publish item"}
        </button>
        <p className="text-center text-xs text-ink-soft">
          Your item becomes available in {CATEGORY_LABELS[category]} Discover.
        </p>
      </div>
    </form>
  );
}
