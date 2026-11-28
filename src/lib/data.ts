import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExchangeAgreement, Item, Match, Message, Profile, Review } from "./types";

const PUBLIC_PROFILE = `id, full_name, avatar_url, city, bio, interests, completed_exchanges, avg_rating, review_count, show_city, show_rating`;

const ITEM_SELECT = `id, owner_id, category, title, description, condition, status, attributes, deleted_at, created_at, updated_at,
  item_images(url, position),
  owner:profiles!items_owner_id_fkey(${PUBLIC_PROFILE})`;

export const MATCH_SELECT = `id, status, created_at,
  item_a:items!matches_item_a_id_fkey(${ITEM_SELECT}),
  item_b:items!matches_item_b_id_fkey(${ITEM_SELECT}),
  agreement:exchange_agreements(*)`;

function sortImages(item: Item): Item {
  return {
    ...item,
    item_images: [...(item.item_images ?? [])].sort((a, b) => a.position - b.position),
  };
}

export function sortMatchImages(match: Match): Match {
  return {
    ...match,
    item_a: sortImages(match.item_a),
    item_b: sortImages(match.item_b),
  };
}

export async function getMyItems(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Item[]).map(sortImages);
}

export async function getMyAvailableItems(supabase: SupabaseClient, userId: string) {
  const items = await getMyItems(supabase, userId);
  return items.filter((item) => item.status === "available");
}

export async function getMyItem(supabase: SupabaseClient, userId: string, itemId: string) {
  const { data } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? sortImages(data as unknown as Item) : null;
}

export async function getItem(supabase: SupabaseClient, itemId: string) {
  const { data } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? sortImages(data as unknown as Item) : null;
}

export async function getMatch(supabase: SupabaseClient, matchId: string) {
  const { data } = await supabase.from("matches").select(MATCH_SELECT).eq("id", matchId).maybeSingle();
  return data ? sortMatchImages(data as unknown as Match) : null;
}


export async function getMatches(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMatches failed", { code: error.code, message: error.message });
    throw new Error("Could not load matches.");
  }

  return ((data ?? []) as unknown as Match[]).map(sortMatchImages);
}


export async function getMessages(supabase: SupabaseClient, matchId: string) {
  const { data } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, image_url, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []) as Message[];
}

export async function getAgreement(supabase: SupabaseClient, matchId: string) {
  const { data } = await supabase
    .from("exchange_agreements")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  return (data ?? null) as ExchangeAgreement | null;
}

export async function getMyAgreements(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("exchange_agreements")
    .select(`*, match:matches!exchange_agreements_match_id_fkey(${MATCH_SELECT})`)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as (ExchangeAgreement & { match: Match })[];
}

export async function getUnreadNotificationCount(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function getReviewsReceived(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("reviews")
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(${PUBLIC_PROFILE})`)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Review[];
}

export async function getReviewsGiven(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("reviews")
    .select(`*, reviewee:profiles!reviews_reviewee_id_fkey(${PUBLIC_PROFILE})`)
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Review[];
}

export async function getChatSummaries(supabase: SupabaseClient, userId: string) {
  const matches = await getMatches(supabase);
  if (!matches.length) return [];

  const ids = matches.map((m) => m.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, image_url, created_at")
    .in("match_id", ids)
    .order("created_at", { ascending: false })
    .limit(1000);

  const latest = new Map<string, Message>();
  for (const message of (messages ?? []) as Message[]) {
    if (!latest.has(message.match_id)) latest.set(message.match_id, message);
  }

  return matches
    .map((match) => ({
      match,
      other: otherOwner(match, userId),
      last: latest.get(match.id) ?? null,
    }))
    .sort((a, b) => {
      const at = a.last?.created_at ?? a.match.created_at;
      const bt = b.last?.created_at ?? b.match.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
}

export async function getUserItems(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("owner_id", userId)
    .eq("status", "available")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Item[]).map(sortImages);
}

export async function getPublicProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE)
    .eq("id", userId)
    .maybeSingle();
  return (data ?? null) as Profile | null;
}

export function otherItem(match: Match, userId: string) {
  return match.item_a.owner_id === userId ? match.item_b : match.item_a;
}

export function myItem(match: Match, userId: string) {
  return match.item_a.owner_id === userId ? match.item_a : match.item_b;
}

export function otherOwner(match: Match, userId: string) {
  return otherItem(match, userId).owner ?? null;
}
