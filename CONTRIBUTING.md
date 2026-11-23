# Contributing

## Table of Contents

- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Standards and Guidelines](#standards-and-guidelines)
  - [Swap Rules](#swap-rules)
  - [Project Structure](#project-structure)
  - [Database Guidelines](#database-guidelines)
  - [Testing Guidelines](#testing-guidelines)
- [Questions](#questions)

## Getting Started

When contributing to SWAPA, it's good to know how the project is built. SWAPA is a free peer-to-peer item-swapping app written in TypeScript with Next.js 15, React 19 and Tailwind CSS 4. The backend is Supabase: it handles the database, authentication and storage. PostHog is used for optional analytics, and ESLint is used to check the code.

Before you start, you need:

- Node.js 20.20+ or 22.22+
- npm
- A Supabase project (free tier is fine)

## How to Contribute

1. Set up the project as described in the [README](README.md):
   - copy `.env.example` to `.env.local` and fill in your Supabase values;
   - run every migration from `supabase/migrations/` in order (Supabase SQL Editor or `supabase db push`);
   - in Supabase Authentication → Providers → Email, enable email/password.
2. Start the app:
   ```bash
   npm install
   npm run dev
   ```
   and open <http://localhost:3000>.
3. Make your changes.
4. Run the production checks:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
5. Test the main flows (see [Testing Guidelines](#testing-guidelines)).
6. Open a pull request and describe what you changed.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Standards and Guidelines

### Swap Rules

Changes must keep the core rules of SWAPA:

- There are only three categories: Clothing, Books, Home.
- Swaps happen within the same category, between exact item pairs.
- Both people must agree before items are reserved.
- Both people must confirm completion before the swap is final.

### Project Structure

Put new code where it belongs:

- `src/app/(app)/` – app pages: discover, matches, chats, profile, notifications, settings, items, users, admin/reports, onboarding
- `src/app/login/`, `src/app/signup/` – auth pages
- `src/app/page.tsx` – landing page
- `src/components/` – shared UI
- `src/lib/` – data helpers, types, constants, Supabase clients
- `supabase/migrations/` – database migrations

### Database Guidelines

- Run every migration in order.
- What is enforced where:

| Rule | Enforced by |
|---|---|
| Only the item owner can edit/delete it | RLS + `delete_my_item` RPC |
| Same-category swaps only | `handle_swipe` trigger + `discover_feed` RPC |
| Mutual likes create exact item-pair matches | `handle_swipe` trigger + `unique (item_a_id, item_b_id)` |
| Both must agree before reservation | `agree_to_exchange` RPC with row locks |
| One reservation per item | Item row locks + status checks in the RPC |
| Both must confirm completion | `complete_exchange` RPC |
| Reviews only after completion, once per person | `submit_review` RPC + unique constraint |
| Blocked users cannot interact | `is_blocked` checks in RLS/RPCs |
| Email stays private | Column-level grants on profiles |
| Chat images stay private | Private bucket + participant storage policies |

### Testing Guidelines

Run the automated checks before opening a pull request:

```bash
npm test
npm run typecheck
npm run lint
```

Put new unit tests next to the module they test as `*.test.ts`. Keep logic you want to test in plain functions without Supabase or Next.js imports, like `src/lib/match.ts`.

The README also describes how to test the main flows by hand:

- A. Two-user happy path
- B. Category isolation
- C. Multiple matches, one reservation
- D. Duplicate interactions
- E. Skip cooldown
- F. Notifications and preferences
- G. Blocking and reporting
- H. Admin moderation

## License

By contributing to SWAPA, you agree that your contributions will be licensed under the [MIT License](LICENSE), the same license as the rest of the project.
## Questions

If you have any questions or problems, open an issue in this repository.
