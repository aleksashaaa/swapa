"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/session";
import { track } from "@/lib/track";
import {
  CATEGORIES,
  CONDITIONS,
  MAX_ITEM_IMAGES,
  OPTIONAL_ATTRIBUTES,
  type Category,
} from "@/lib/constants";

export type ItemState = { error?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const oneOf = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

function validImageUrl(url: string, userId: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-images/${userId}/`;
  return url.startsWith(prefix);
}

function readItem(f: FormData, userId: string) {
  const category = str(f, "category");
  const title = str(f, "title");
  const description = str(f, "description");
  const condition = str(f, "condition");
  const images = f.getAll("images").map(String).map((x) => x.trim()).filter(Boolean);

  if (!oneOf(CATEGORIES, category)) return { error: "Please choose a category." as string };
  if (title.length < 2 || title.length > 80) return { error: "Title must be 2–80 characters." };
  if (description.length < 10 || description.length > 1000) {
    return { error: "Description must be 10–1000 characters." };
  }
  if (!oneOf(CONDITIONS, condition)) return { error: "Please choose a condition." };
  if (images.length < 1) return { error: "Add at least one photo." };
  if (images.length > MAX_ITEM_IMAGES) return { error: `Add no more than ${MAX_ITEM_IMAGES} photos.` };
  if (images.some((url) => !validImageUrl(url, userId))) {
    return { error: "One of the photos could not be verified. Please upload it again." };
  }

  const attributes: Record<string, string> = {};
  for (const field of OPTIONAL_ATTRIBUTES[category as Category]) {
    const value = str(f, `attr_${field.key}`);
    if (value) attributes[field.key] = value.slice(0, 120);
  }

  return {
    value: {
      category: category as Category,
      title,
      description,
      condition: condition as (typeof CONDITIONS)[number],
      attributes,
      images,
    },
  };
}

export async function createItem(_prev: ItemState, formData: FormData): Promise<ItemState> {
  const session = await requireOnboarded();
  const parsed = readItem(formData, session.userId);
  if ("error" in parsed) return { error: parsed.error };
  const item = parsed.value!;

  const { data, error } = await session.supabase
    .from("items")
    .insert({
      owner_id: session.userId,
      category: item.category,
      title: item.title,
      description: item.description,
      condition: item.condition,
      attributes: item.attributes,
      status: "available",
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save the item." };

  const { error: imageError } = await session.supabase.from("item_images").insert(
    item.images.map((url, position) => ({ item_id: data.id, url, position })),
  );
  if (imageError) return { error: imageError.message };

  await track(session.supabase, session.userId, "item_created", {
    item_id: data.id,
    category: item.category,
    image_count: item.images.length,
  });
  await track(session.supabase, session.userId, "item_published", {
    item_id: data.id,
    category: item.category,
  });

  revalidatePath("/profile/items");
  revalidatePath("/discover");
  redirect("/profile/items?created=1");
}

export async function updateItem(_prev: ItemState, formData: FormData): Promise<ItemState> {
  const session = await requireOnboarded();
  const itemId = str(formData, "item_id");
  const parsed = readItem(formData, session.userId);
  if ("error" in parsed) return { error: parsed.error };
  const item = parsed.value!;

  const { data: existing } = await session.supabase
    .from("items")
    .select("id, owner_id, item_images(id, url, position)")
    .eq("id", itemId)
    .eq("owner_id", session.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return { error: "Item not found." };

  const { error } = await session.supabase
    .from("items")
    .update({
      category: item.category,
      title: item.title,
      description: item.description,
      condition: item.condition,
      attributes: item.attributes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("owner_id", session.userId);

  if (error) return { error: error.message };

  const previous = (existing.item_images ?? []) as { id: string; url: string }[];
  const removed = previous.filter((img) => !item.images.includes(img.url));
  if (removed.length) {
    const { error: deleteError } = await session.supabase
      .from("item_images")
      .delete()
      .in("id", removed.map((img) => img.id));
    if (deleteError) return { error: deleteError.message };
  }

  const kept = previous.filter((img) => item.images.includes(img.url));
  const added = item.images.filter((url) => !previous.some((img) => img.url === url));
  const updates = [
    ...kept.map((img) => ({
      id: img.id,
      item_id: itemId,
      url: img.url,
      position: item.images.indexOf(img.url),
    })),
  ];
  if (updates.length) {
    const { error: updateError } = await session.supabase.from("item_images").upsert(updates);
    if (updateError) return { error: updateError.message };
  }
  if (added.length) {
    const { error: addError } = await session.supabase.from("item_images").insert(
      added.map((url) => ({ item_id: itemId, url, position: item.images.indexOf(url) })),
    );
    if (addError) return { error: addError.message };
  }

  await track(session.supabase, session.userId, "item_updated", { item_id: itemId });
  revalidatePath("/profile/items");
  revalidatePath(`/profile/items/${itemId}/edit`);
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/discover");
  redirect("/profile/items?updated=1");
}

export async function setItemStatus(itemId: string, status: "paused" | "available") {
  const session = await requireOnboarded();
  if (!["paused", "available"].includes(status)) return { error: "Invalid status." };

  const { error } = await session.supabase
    .from("items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("owner_id", session.userId)
    .is("deleted_at", null);

  if (error) {
    return { error: "This item cannot be paused or reactivated right now." };
  }

  revalidatePath("/profile/items");
  revalidatePath("/discover");
  return {};
}

export async function deleteItem(itemId: string) {
  const session = await requireOnboarded();
  const { data, error } = await session.supabase.rpc("delete_my_item", { p_item_id: itemId });
  if (error) return { error: error.message };
  const result = data as { error?: string; ok?: boolean } | null;
  if (result?.error) return { error: result.error };

  await track(session.supabase, session.userId, "item_deleted", { item_id: itemId });
  revalidatePath("/profile/items");
  revalidatePath("/discover");
  revalidatePath("/matches");
  return {};
}
