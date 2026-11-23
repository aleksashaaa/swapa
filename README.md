# SWAPA

SWAPA is a free peer-to-peer item-swapping app built with Next.js 15, React 19, TypeScript, Supabase and Tailwind CSS 4.

Three categories only: **Clothing**, **Books**, **Home**. Swaps happen within the same category, between exact item pairs. Both people must agree before items are reserved, and both must confirm completion before the swap is final.

---

## 1. Requirements

- Node.js 20.20+ or 22.22+ (recommended; `posthog-node` prints a warning on older Node 22 releases)
- A Supabase project (free tier is fine)
- npm

---

## 2. Environment

Copy the example file and fill in your Supabase values:

```powershell
cd swapa
copy .env.example .env.local
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional analytics. Leave blank to disable.
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# How long a skipped item stays hidden. 0 makes skips reappear immediately.
SKIP_COOLDOWN_HOURS=24
```

You can find the URL and anon key in **Supabase → Project Settings → API**.

---

## 3. Database

Run every migration in order in the **Supabase SQL Editor**, or with the Supabase CLI:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Migration order:

| File | What it adds |
| --- | --- |
| `0001_base.sql` | Profiles, RLS, signup trigger |
| `0002_items.sql` | Items, images, conditions, statuses |
| `0003_swipes.sql` | Item-pair swipes |
| `0004_matches.sql` | Matches + mutual-like trigger |
| `0005_chat.sql` | Messages |
| `0006_exchanges.sql` | Exchange agreements + initial RPCs |
| `0007_match_status.sql` | `reserved` / `completed` match statuses |
| `0008_social.sql` | Notifications, prefs, reviews, blocks, reports, hardened RLS |
| `0009_exchange_hardening.sql` | Locked, concurrency-safe exchange RPCs |
| `0010_storage.sql` | `item-images`, `avatars`, `chat-images` buckets + policies |
| `0011_discover_feed.sql` | Cooldown-aware Discover RPC |
| `0012_rpc_actions.sql` | Safe item deletion + blocking RPCs |
| `0013_item_image_update.sql` | Image reordering + match-history reads for soft-deleted items |

The migrations create the storage buckets automatically. If your SQL editor role cannot write to `storage.objects`, create the three buckets manually in **Storage** first, then run `0010_storage.sql`.

### Auth settings

In **Authentication → Providers → Email**:

- Enable email/password.
- For fast local testing, turn **Confirm email** off.
- If you keep confirmation on, set the redirect URL to `http://localhost:3000/auth/callback`.

---

## 4. Run

```powershell
cd swapa
npm install
npm run dev
```

Open <http://localhost:3000>.

Production checks:

```powershell
npm run typecheck
npm run lint
npm run build
npm start
```

---

## 5. How to test the main flows

### A. Two-user happy path

1. Open a normal window and sign up as **Alex**.
2. Complete onboarding: name, city, photo (optional), interests.
3. Add a **Clothing** item and a **Books** item in **Profile → My Items → Add item**.
4. Open an incognito window and sign up as **Sam** with another email.
5. Sam adds a **Clothing** item.
6. As Alex: **Discover → Clothing**, select Alex's clothing item, like Sam's item.
7. As Sam: **Discover → Clothing**, select Sam's item, like Alex's item.
8. A match appears in **Matches** and **Chats**.
9. Open the match, send a message.
10. One person clicks **I want to swap**; the other confirms. Both items become **Reserved**.
11. Both click **I received my item**. The exchange becomes **Completed** and both items become **Completed**.
12. Leave a review from the completed exchange. It appears in **Profile → Reviews** and on the public profile.

### B. Category isolation

- Alex offers a **Books** item. Sam's clothing item must never appear in that feed.
- Likes across categories are ignored by the database trigger as well.

### C. Multiple matches, one reservation

1. Alex has two clothing items: `Jacket` and `Scarf`.
2. Sam likes `Jacket`, Alex likes Sam's `Coat` → match 1.
3. Another user likes `Jacket` with their item → match 2 (allowed).
4. Agree to match 1. `Jacket` becomes reserved and competing matches for `Jacket` close.
5. Try to agree to match 2 from another browser. It must fail because `Jacket` is no longer available.
6. Cancel the agreed exchange. Both items return to **Available**, and the competing match becomes open again.

### D. Duplicate interactions

- Like/skip the same item twice. The swipe is upserted, not duplicated.
- Submit a review twice for the same exchange. The second attempt is rejected.
- Try to send a message after a match is completed or cancelled. The composer is disabled and the RLS policy rejects writes.

### E. Skip cooldown

- With `SKIP_COOLDOWN_HOURS=24`, skipped items stay hidden.
- Set it to `0`, restart the dev server, and skipped items can reappear.

### F. Notifications and preferences

- Match, message, exchange agreed, exchange completed, review and item-status notifications appear in **Notifications**.
- In **Settings**, turn one type off and repeat the action. The notification should not be created.
- Use **Mark all as read**.

### G. Blocking and reporting

- Open another member's profile and click **Block**.
- Their items disappear from Discover and open matches close.
- Conversations remain readable but become read-only.
- Unblock from **Settings → Blocked people**.
- Use **Report** on an item, user, message or review. Reports go to `/admin/reports`.

### H. Admin moderation

Promote a test user in SQL:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Then open `/admin/reports` and change report statuses.

---

## 6. What is enforced where

| Rule | Enforced by |
| --- | --- |
| Only the item owner can edit/delete it | RLS + `delete_my_item` RPC |
| Same-category swaps only | `handle_swipe` trigger + `discover_feed` RPC |
| Mutual likes create exact item-pair matches | `handle_swipe` trigger + unique `(item_a_id, item_b_id)` |
| Both must agree before reservation | `agree_to_exchange` RPC with row locks |
| One reservation per item | Item row locks + status checks in the RPC |
| Both must confirm completion | `complete_exchange` RPC |
| Reviews only after completion, once per person | `submit_review` RPC + unique constraint |
| Blocked users cannot interact | `is_blocked` checks in RLS/RPCs |
| Email stays private | Column-level grants on `profiles` |
| Chat images stay private | Private bucket + participant storage policies |

---

## 7. Project structure

```
swapa/
  src/app/
    (app)/
      discover/          swipe deck + feed
      matches/           match list, chat, exchange panel, reviews
      chats/             conversation list
      profile/           profile, items, exchanges, reviews, actions
      notifications/     notification inbox
      settings/          notification prefs, privacy, blocked users
      items/[id]/        public item detail
      users/[id]/        public member profile
      admin/reports/     moderation
      onboarding/        3-step wizard
    login/ signup/       auth pages
    page.tsx             landing page
  src/components/        shared UI
  src/lib/               data helpers, types, constants, Supabase clients
  supabase/migrations/   0001–0013
```

---

## 8. License

SWAPA is released under the [MIT License](LICENSE). Copyright (c) 2026 SWAPA Team.
