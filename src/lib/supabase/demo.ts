// LOCAL DEMO ONLY: in-memory stand-in for Supabase, enabled with NEXT_PUBLIC_DEMO=1.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
const ME = "u-me";
const now = () => new Date().toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const img = (seed: string) => `/demo/${seed}.svg`;
let counter = 1000;
const uid = () => `d-${++counter}`;

function seed() {
  const profile = (id: string, name: string, city: string, extra: Row = {}): Row => ({
    id, full_name: name, avatar_url: null, city, bio: "Loves giving things a second life.",
    interests: ["Sustainability", "Vintage", "Books"], completed_exchanges: 2, avg_rating: 4.8,
    review_count: 5, is_admin: id === ME, onboarding_completed: true, show_city: true,
    show_rating: true, created_at: ago(500), ...extra,
  });
  const item = (id: string, owner: string, category: string, title: string, condition = "good"): Row => ({
    id, owner_id: owner, category, title, description: `${title}. Well kept, ready for a new home.`,
    condition, status: "available", attributes: {}, deleted_at: null, created_at: ago(48), updated_at: ago(48),
  });
  const items = [
    item("i-me-1", ME, "clothing", "Denim jacket", "like_new"),
    item("i-me-2", ME, "books", "Clean Code (paperback)"),
    item("i-me-3", ME, "home", "Ceramic coffee set"),
    item("i-a-1", "u-aida", "clothing", "Wool scarf", "like_new"),
    item("i-a-2", "u-aida", "books", "Atomic Habits"),
    item("i-b-1", "u-bek", "clothing", "Vintage windbreaker"),
    item("i-b-2", "u-bek", "home", "Table lamp", "fair"),
    item("i-c-1", "u-dana", "books", "The Pragmatic Programmer"),
    item("i-c-2", "u-dana", "home", "Plant pot set", "like_new"),
  ];
  const [x, y] = ["i-me-1", "i-a-1"].sort();
  return {
    profiles: [
      profile(ME, "Demo User", "Almaty"),
      profile("u-aida", "Aida N.", "Almaty"),
      profile("u-bek", "Bek T.", "Astana"),
      profile("u-dana", "Dana K.", "Almaty"),
    ],
    items,
    item_images: items.map((it, n) => ({ id: `im-${n}`, item_id: it.id, url: img(it.id), position: 0 })),
    swipes: [] as Row[],
    matches: [{ id: "m-1", status: "active", item_a_id: x, item_b_id: y, created_at: ago(5) }],
    exchange_agreements: [] as Row[],
    messages: [
      { id: "ms-1", match_id: "m-1", sender_id: "u-aida", body: "Hi! Is the jacket still available?", image_url: null, created_at: ago(4) },
      { id: "ms-2", match_id: "m-1", sender_id: ME, body: "Yes! Want to swap for the scarf?", image_url: null, created_at: ago(3) },
    ],
    notifications: [
      { id: "n-1", user_id: ME, type: "match", payload: { match_id: "m-1" }, read_at: null, created_at: ago(5) },
    ],
    notification_preferences: [
      { user_id: ME, new_match: true, new_message: true, exchange_agreed: true, exchange_completed: true, new_review: true, item_status: true },
    ],
    reviews: [] as Row[],
    reports: [] as Row[],
    user_blocks: [] as Row[],
    events: [] as Row[],
  };
}

const g = globalThis as any;
const db: Record<string, Row[]> = (g.__swapaDemo ??= seed());

// ---- select parsing ---------------------------------------------------------
type Sel = { star: boolean; fields: string[]; rels: { alias: string; table: string; fk?: string; sel: Sel }[] };

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseSel(s: string): Sel {
  const sel: Sel = { star: false, fields: [], rels: [] };
  for (const part of splitTop(s)) {
    const open = part.indexOf("(");
    if (open === -1) {
      if (part === "*") sel.star = true; else sel.fields.push(part);
      continue;
    }
    const head = part.slice(0, open);
    const inner = part.slice(open + 1, part.lastIndexOf(")"));
    const [alias, rest] = head.includes(":") ? head.split(":") : [head, head];
    const [table, fk] = rest.split("!");
    sel.rels.push({ alias, table, fk, sel: parseSel(inner) });
  }
  return sel;
}

const SINGULAR: Record<string, string> = {
  items: "item", matches: "match", profiles: "profile", exchange_agreements: "agreement",
};

function project(table: string, row: Row, sel: Sel): Row {
  const out: Row = sel.star ? { ...row } : {};
  for (const f of sel.fields) out[f] = row[f];
  for (const rel of sel.rels) {
    let col: string | undefined;
    let parent = false;
    if (rel.fk) {
      const stripped = rel.fk.replace(/_fkey$/, "");
      col = stripped.startsWith(table + "_") ? stripped.slice(table.length + 1) : stripped;
      parent = col in row;
    }
    if (parent && col) {
      const target = (db[rel.table] ?? []).find((r) => r.id === row[col!]);
      out[rel.alias] = target ? project(rel.table, target, rel.sel) : null;
    } else {
      const fkCol = `${SINGULAR[table] ?? table}_id`;
      const children = (db[rel.table] ?? []).filter((r) => r[col ?? fkCol] === row.id);
      out[rel.alias] = rel.table === "exchange_agreements"
        ? (children[0] ? project(rel.table, children[0], rel.sel) : null)
        : children.map((c) => project(rel.table, c, rel.sel));
    }
  }
  return out;
}

// ---- query builder ----------------------------------------------------------
class Query implements PromiseLike<any> {
  private filters: ((r: Row) => boolean)[] = [];
  private sel: Sel | null = null;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any;
  private orderBy: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private head = false;
  private count = false;
  private ret = false;

  constructor(private table: string) {}

  select(s = "*", opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.sel = parseSel(s); else { this.ret = true; this.sel = parseSel(s); }
    this.head = Boolean(opts?.head);
    this.count = Boolean(opts?.count);
    return this;
  }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this; }
  is(c: string, v: any) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  in(c: string, v: any[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  private run(): { data: any; error: any; count?: number } {
    const rows = (db[this.table] ??= []);
    const hit = () => rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === "insert" || this.op === "upsert") {
      const list: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
      const created = list.map((p) => {
        if (this.op === "upsert") {
          const existing = rows.find((r) =>
            this.table === "swipes"
              ? r.actor_id === p.actor_id && r.offering_item_id === p.offering_item_id && r.target_item_id === p.target_item_id
              : p.id && r.id === p.id);
          if (existing) { Object.assign(existing, p); return existing; }
        }
        const row: Row = { id: uid(), created_at: now(), ...p };
        rows.push(row);
        if (this.table === "swipes" && row.action === "like") maybeMatch(row);
        if (this.table === "items" && !row.status) row.status = "available";
        return row;
      });
      return this.finish(this.ret ? created : [], true);
    }
    if (this.op === "update") {
      const changed = hit();
      changed.forEach((r) => Object.assign(r, this.payload));
      return this.finish(this.ret ? changed : [], true);
    }
    if (this.op === "delete") {
      const gone = hit();
      db[this.table] = rows.filter((r) => !gone.includes(r));
      return this.finish([], true);
    }
    let out = hit();
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) out = out.slice(0, this.max);
    return this.finish(out, false);
  }

  private finish(rows: Row[], mutation: boolean) {
    const projected = this.sel && !(mutation && !this.ret)
      ? rows.map((r) => project(this.table, r, this.sel!))
      : rows;
    if (this.head) return { data: null, error: null, count: rows.length };
    if (this.mode === "many") return { data: projected, error: null, count: this.count ? rows.length : undefined };
    if (!projected[0]) {
      return { data: null, error: this.mode === "single" && !mutation ? { message: "Row not found" } : null };
    }
    return { data: projected[0], error: null };
  }

  then<T1, T2>(ok?: (v: any) => T1 | PromiseLike<T1>, bad?: (e: any) => T2 | PromiseLike<T2>) {
    try { return Promise.resolve(this.run()).then(ok, bad); } catch (e) { return Promise.reject(e).then(ok, bad); }
  }
}

function maybeMatch(swipe: Row) {
  // Demo: liking any item makes the owner like back, so matches show up instantly.
  const target = db.items.find((i) => i.id === swipe.target_item_id);
  if (!target) return;
  const [a, b] = [swipe.offering_item_id, swipe.target_item_id].sort();
  if (db.matches.some((m) => m.item_a_id === a && m.item_b_id === b)) return;
  db.matches.push({ id: uid(), status: "active", item_a_id: a, item_b_id: b, created_at: now() });
}

// ---- rpc --------------------------------------------------------------------
function agreement(matchId: string) {
  let ag = db.exchange_agreements.find((r) => r.match_id === matchId);
  if (!ag) {
    const m = db.matches.find((r) => r.id === matchId)!;
    const ownerA = db.items.find((i) => i.id === m.item_a_id)!.owner_id;
    const ownerB = db.items.find((i) => i.id === m.item_b_id)!.owner_id;
    ag = {
      id: uid(), match_id: matchId, user_a_id: ownerA, user_b_id: ownerB,
      user_a_agreed: false, user_b_agreed: false, user_a_completed: false, user_b_completed: false,
      status: "pending", agreed_at: null, completed_at: null, cancelled_at: null, created_at: now(),
    };
    db.exchange_agreements.push(ag);
  }
  return ag;
}

function rpc(name: string, a: Row): any {
  const match = a.p_match_id ? db.matches.find((m) => m.id === a.p_match_id) : null;
  switch (name) {
    case "discover_feed": {
      const offering = db.items.find((i) => i.id === a.p_offering_item_id);
      if (!offering) return [];
      const swiped = db.swipes
        .filter((s) => s.actor_id === ME && s.offering_item_id === offering.id)
        .map((s) => s.target_item_id);
      return db.items
        .filter((i) => i.owner_id !== ME && i.category === offering.category && i.status === "available" && !i.deleted_at && !swiped.includes(i.id))
        .map((i) => ({
          id: i.id, title: i.title, description: i.description, condition: i.condition, category: i.category,
          attributes: i.attributes, created_at: i.created_at,
          images: db.item_images.filter((x) => x.item_id === i.id).map((x) => ({ url: x.url, position: x.position })),
        }));
    }
    case "is_match_blocked": return false;
    case "agree_to_exchange": {
      const ag = agreement(a.p_match_id);
      if (ME === ag.user_a_id) ag.user_a_agreed = true; else ag.user_b_agreed = true;
      // Demo: the other person agrees right away.
      ag.user_a_agreed = ag.user_b_agreed = true;
      ag.status = "agreed"; ag.agreed_at = now();
      if (match) match.status = "reserved";
      return { status: "agreed" };
    }
    case "complete_exchange": {
      const ag = agreement(a.p_match_id);
      ag.user_a_completed = ag.user_b_completed = true;
      ag.status = "completed"; ag.completed_at = now();
      if (match) match.status = "completed";
      for (const id of [ag.user_a_id, ag.user_b_id]) {
        const pr = db.profiles.find((x) => x.id === id);
        if (pr) pr.completed_exchanges += 1;
      }
      return { status: "completed" };
    }
    case "cancel_exchange": {
      const ag = agreement(a.p_match_id);
      ag.status = "cancelled"; ag.cancelled_at = now();
      if (match) match.status = "cancelled";
      return { status: "cancelled" };
    }
    case "submit_review": {
      const ag = agreement(a.p_match_id);
      db.reviews.push({
        id: uid(), agreement_id: ag.id, match_id: a.p_match_id, reviewer_id: ME,
        reviewee_id: ag.user_a_id === ME ? ag.user_b_id : ag.user_a_id,
        rating: a.p_rating, body: a.p_body, created_at: now(),
      });
      const who = db.profiles.find((x) => x.id === (ag.user_a_id === ME ? ag.user_b_id : ag.user_a_id));
      if (who) {
        who.avg_rating = Math.round(((who.avg_rating * who.review_count + a.p_rating) / (who.review_count + 1)) * 10) / 10;
        who.review_count += 1;
      }
      return { ok: true };
    }
    case "delete_my_item": {
      const it = db.items.find((i) => i.id === a.p_item_id);
      if (it) it.deleted_at = now();
      return { ok: true };
    }
    case "block_user":
      db.user_blocks.push({ id: uid(), blocker_id: ME, blocked_id: a.p_user_id, created_at: now() });
      return { ok: true };
    default: return null;
  }
}

// ---- client -----------------------------------------------------------------
const demoUser = { id: ME, email: "demo@swapa.local" };

type DemoCookies = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, opts?: Record<string, unknown>): void;
  delete(name: string): void;
};

// Signed-in by default; signing out sets the demo_out cookie until the next sign-in.
export function createDemoClient(cookies?: DemoCookies): any {
  const isOut = () => {
    if (cookies) return cookies.get("demo_out")?.value === "1";
    return typeof document !== "undefined" && document.cookie.includes("demo_out=1");
  };
  const signedIn = () => {
    try { cookies?.delete("demo_out"); } catch { /* read-only context */ }
    return { data: { user: demoUser, session: {} }, error: null };
  };
  return {
    from: (table: string) => new Query(table),
    rpc: (name: string, args: Row = {}) => Promise.resolve({ data: rpc(name, args), error: null }),
    auth: {
      getUser: async () =>
        isOut() ? { data: { user: null }, error: null } : { data: { user: demoUser }, error: null },
      signInWithPassword: async () => signedIn(),
      signUp: async () => signedIn(),
      signOut: async () => {
        try { cookies?.set("demo_out", "1", { path: "/" }); } catch { /* read-only context */ }
        return { error: null };
      },
      exchangeCodeForSession: async () => ({ error: null }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` },
        }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({ path: p, signedUrl: img('i-me-2') })),
        }),
      }),
    },
  };
}

export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
