export type MatchStatus = "active" | "reserved" | "completed" | "cancelled";

/** Statuses in which two items are currently matched and can chat. */
export const OPEN_MATCH_STATUSES: readonly MatchStatus[] = ["active", "reserved"];

export function isOpenMatch(status: string | null | undefined): boolean {
  return status != null && (OPEN_MATCH_STATUSES as readonly string[]).includes(status);
}

/**
 * Did this swipe open the match?
 *
 * The `handle_swipe` database trigger creates (or re-opens) the match row
 * inside the same statement as the swipe upsert, so the server action can't
 * see the trigger's result directly. Instead it reads the match status before
 * and after the upsert: if the pair was not open before and is open after,
 * this swipe is the one that produced the match.
 *
 * Comparing statuses avoids relying on `created_at` timing, which breaks with
 * clock skew between the app server and the database and misses matches that
 * were re-opened from `cancelled`.
 */
export function swipeOpenedMatch(
  statusBefore: string | null | undefined,
  statusAfter: string | null | undefined,
): boolean {
  return !isOpenMatch(statusBefore) && isOpenMatch(statusAfter);
}

/** Matches store the lexicographically smaller item id first. */
export function normalizeItemPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}
