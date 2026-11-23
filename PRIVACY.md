# Privacy and Data Security

_Last updated: 2026-11-23._

SWAPA is a free, open-source item-swapping app. We collect only what is needed to let people swap items, and we do not sell data or show ads. This document explains what is stored, who can see it and how it is protected. If you run your own instance, you are the data controller for it.

## 1. What we store

| Data | Why | Who can see it |
| --- | --- | --- |
| E-mail and password (handled by Supabase Auth; the app never stores passwords itself) | Sign-in | Only you and instance admins |
| Profile: name, city, bio, interests, avatar | Show who you swap with | Other members. City and rating can be hidden in **Settings → Privacy** |
| Items: title, description, condition, category, photos | Swapping | Public item pages. Discover shows items without owner details until a match |
| Swipes (likes and skips) | Find matches | Only you |
| Matches, exchange agreements, reviews | Run the swap flow | The two people in the match. Reviews are public on profiles |
| Chat messages and chat images | Arrange the exchange | Only the two people in the match. Chat images are in a private bucket and opened with short-lived signed links (1 hour) |
| Blocks and reports | Safety and moderation | The blocking or reporting user and admins |
| Notifications and preferences | In-app notifications | Only you |
| Usage events (e.g. `item_liked`, `login_completed`) | Understand and improve the product | Instance admins |

## 2. Analytics (optional)

Analytics is **off by default**: it runs only if `NEXT_PUBLIC_POSTHOG_KEY` is set. When enabled, SWAPA sends event names and your internal user id to PostHog (EU host) through the app's own `/ingest` path. Session recording masks all form inputs. Events are also written to the `events` table in your own database. To disable, leave the key empty.

## 3. How data is protected

- **Row Level Security** is enabled on database tables, so users can read and change only their own rows and the rows they are allowed to share (see `supabase/migrations/`).
- **Storage policies:** users can upload only into their own folder. Chat images are private to the match participants.
- **Server-side actions** check the signed-in user before every change. Sensitive steps (agreeing, completing, cancelling an exchange, blocking) run as database functions.
- **Transport:** production deployments should be served over HTTPS. Supabase Auth manages sessions with secure cookies.
- **Secrets:** only the Supabase URL and the public anon key are used by the browser. The anon key is safe to expose because access is limited by RLS. Never commit `.env.local`.
- **Uploads** are limited to JPG, PNG and WebP with size caps (5 MB for item and chat images, 2 MB for avatars).

## 4. Your choices

- Edit or remove your profile details, items and photos at any time in the app.
- Hide your city and rating in **Settings → Privacy**.
- Block or report any member.
- Turn notification types on or off in **Settings**.
- **Account deletion:** the app does not yet have a self-service delete button. To delete your account and data, open an issue or contact the maintainers (see `CODE_OF_CONDUCT.md`). Deleting the auth user removes your profile, items, swipes, messages, reviews, notifications and blocks, and detaches your usage events from your id. Users who have an exchange record cannot be deleted by a plain database cascade yet, so the maintainers anonymize those records by hand.

## 5. Sharing and retention

We do not sell or rent personal data and do not share it with advertisers. Data is shared only with the infrastructure you configure (Supabase, hosting, optional PostHog). Data is kept while the account exists. Chat messages and exchange records are kept so both participants can see their history.

## 6. Children

SWAPA is not intended for children under 13 (or the minimum age in your country).

## 7. Reporting a security problem

Please report vulnerabilities privately to the maintainers instead of opening a public issue, and give us reasonable time to fix them before disclosure.

## 8. Changes

We will update this file in the repository when data handling changes. The git history shows every change.
