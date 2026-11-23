"use server";

import { requireOnboarded } from "@/lib/session";
import { track } from "@/lib/track";
import { SKIP_COOLDOWN_HOURS } from "@/lib/config";
import type { Category, Condition } from "@/lib/constants";

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  condition: Condition;
  category: Category;
  attributes: Record<string, string>;
  created_at: string;
  images: { url: string; position: number }[];
};

export type FeedResult = { items?: FeedItem[]; error?: string };

export type SwipeMatch = {
  id: string;
  owner: {
    full_name: string;
    avatar_url: string | null;
    city: string;
    avg_rating: number;
    review_count: number;
  };
  targetTitle: string;
  targetImage: string | null;
};

export type SwipeResult = { error?: string; match?: SwipeMatch; liked?: boolean };

export async function fetchFeed(offeringItemId: string): Promise<FeedResult> {
  const { supabase } = await requireOnboarded();
  const { data, error } = await supabase.rpc("discover_feed", {
    p_offering_item_id: offeringItemId,
    p_skip_cooldown_hours: SKIP_COOLDOWN_HOURS,
  });
  if (error) return { error: error.message };

  const items = ((data ?? []) as {
    id: string;
    title: string;
    description: string;
    condition: Condition;
    category: Category;
    attributes: Record<string, string>;
    created_at: string;
    images: { url: string; position: number }[];
  }[]).map((item) => ({
    ...item,
    attributes: item.attributes ?? {},
    images: [...(item.images ?? [])].sort((a, b) => a.position - b.position),
  }));

  return { items };
}

export async function recordSwipe(
  offeringItemId: string,
  targetItemId: string,
  action: "like" | "skip",
): Promise<SwipeResult> {
  if (!["like", "skip"].includes(action)) return { error: "Unknown action." };
  const { supabase, userId } = await requireOnboarded();

  const { error } = await supabase.from("swipes").upsert(
    {
      actor_id: userId,
      offering_item_id: offeringItemId,
      target_item_id: targetItemId,
      action,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "actor_id,offering_item_id,target_item_id" },
  );

  if (error) return { error: error.message };

  await track(supabase, userId, action === "like" ? "item_liked" : "item_skipped", {
    offering_item_id: offeringItemId,
    target_item_id: targetItemId,
  });

  if (action === "skip") return { liked: false };

  const a = offeringItemId < targetItemId ? offeringItemId : targetItemId;
  const b = offeringItemId < targetItemId ? targetItemId : offeringItemId;
  const { data: match } = await supabase
    .from("matches")
    .select("id, status, created_at")
    .eq("item_a_id", a)
    .eq("item_b_id", b)
    .maybeSingle();

  if (!match || !["active", "reserved"].includes(match.status)) return { liked: true };

  const { data: target } = await supabase
    .from("items")
    .select(
      "title, item_images(url, position), owner:profiles!items_owner_id_fkey(full_name, avatar_url, city, avg_rating, review_count)",
    )
    .eq("id", targetItemId)
    .maybeSingle();

  const owner = (target?.owner ?? null) as unknown as SwipeMatch["owner"] | null;
  if (!owner) return { liked: true, match: undefined };

  const images = ((target?.item_images ?? []) as { url: string; position: number }[]).sort(
    (x, y) => x.position - y.position,
  );

  if (Date.now() - new Date(match.created_at).getTime() < 15_000) {
    await track(supabase, userId, "match_created", { match_id: match.id });
  }

  return {
    liked: true,
    match: {
      id: match.id,
      owner,
      targetTitle: target?.title ?? "Item",
      targetImage: images[0]?.url ?? null,
    },
  };
}
