"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Bell, Eye, Lock, LogOut, Shield, UserX } from "lucide-react";
import { FormAlert } from "@/components/auth-shell";
import { signOut } from "@/app/auth/actions";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";
import {
  unblockUser,
  updateNotificationPreferences,
  updatePrivacy,
  type FormState,
} from "@/app/(app)/profile/actions";

type Prefs = {
  new_match: boolean;
  new_message: boolean;
  exchange_agreed: boolean;
  exchange_completed: boolean;
  new_review: boolean;
  item_status: boolean;
};

type Blocked = { id: string; full_name: string; avatar_url: string | null; city: string };

export function SettingsClient({
  profile,
  prefs,
  blocked,
  email,
}: {
  profile: Profile;
  prefs: Prefs;
  blocked: Blocked[];
  email: string;
}) {
  const [privacyState, privacyAction, privacyPending] = useActionState<FormState, FormData>(
    updatePrivacy,
    {},
  );
  const [prefsState, prefsAction, prefsPending] = useActionState<FormState, FormData>(
    updateNotificationPreferences,
    {},
  );
  const [pendingUnblock, startUnblock] = useTransition();
  const [unblockError, setUnblockError] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage text-sage-dark">
            <Bell className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl">Notifications</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Choose which in-app notifications you receive. Turning one off never hides the event
              itself.
            </p>
          </div>
        </div>

        <form action={prefsAction} className="mt-6 space-y-2">
          {(
            [
              ["new_match", "New matches", "When you and another person like each other's items."],
              ["new_message", "New messages", "When someone sends you a chat message."],
              ["exchange_agreed", "Exchange agreed", "When both people agree and items are reserved."],
              ["exchange_completed", "Exchange completed", "When both people confirm the swap."],
              ["new_review", "New reviews", "When someone reviews a completed exchange."],
              ["item_status", "Item updates", "When one of your items changes status."],
            ] as const
          ).map(([key, label, description]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line bg-white/60 p-4 transition hover:border-sage-dark/50"
            >
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
              </span>
              <Toggle name={key} defaultChecked={prefs[key]} />
            </label>
          ))}
          <FormAlert error={prefsState.error} message={prefsState.message} />
          <button type="submit" disabled={prefsPending} className="btn-primary w-full py-3">
            {prefsPending ? "Saving…" : "Save notification preferences"}
          </button>
        </form>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage text-sage-dark">
            <Eye className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl">Privacy</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Your email and exact address are always private. These two controls affect your public
              profile.
            </p>
          </div>
        </div>

        <form action={privacyAction} className="mt-6 space-y-2">
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line bg-white/60 p-4">
            <span>
              <span className="block text-sm font-semibold">Show my city</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Display your city on your public profile and item pages.
              </span>
            </span>
            <Toggle name="show_city" defaultChecked={profile.show_city ?? true} />
          </label>
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line bg-white/60 p-4">
            <span>
              <span className="block text-sm font-semibold">Show my rating</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Display your average rating and review count publicly.
              </span>
            </span>
            <Toggle name="show_rating" defaultChecked={profile.show_rating ?? true} />
          </label>
          <FormAlert error={privacyState.error} message={privacyState.message} />
          <button type="submit" disabled={privacyPending} className="btn-primary w-full py-3">
            {privacyPending ? "Saving…" : "Save privacy settings"}
          </button>
        </form>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage text-sage-dark">
            <Shield className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl">Blocked people</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Blocking hides their items from Discover and closes open matches. Existing conversations
              become read-only.
            </p>
          </div>
        </div>

        {unblockError && (
          <p role="alert" className="mt-4 rounded-xl bg-[#F7E9E2] px-3 py-2 text-sm text-[#8B3D1F]">
            {unblockError}
          </p>
        )}

        {blocked.length ? (
          <ul className="mt-5 space-y-2">
            {blocked.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white/60 p-3"
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-sage-dark">
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold">{initials(person.full_name)}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{person.full_name}</p>
                  <p className="text-xs text-ink-soft">{person.city || "City not set"}</p>
                </div>
                <button
                  type="button"
                  disabled={pendingUnblock}
                  onClick={() =>
                    startUnblock(async () => {
                      const result = await unblockUser(person.id);
                      if (result.error) setUnblockError(result.error);
                    })
                  }
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <UserX className="size-3.5" aria-hidden /> Unblock
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl bg-sage/25 px-4 py-5 text-sm text-ink-soft">
            You haven&apos;t blocked anyone.
          </p>
        )}
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sage text-sage-dark">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl">Account</h2>
            <p className="mt-1 break-all text-sm text-ink-soft">
              Signed in as <span className="font-medium text-ink">{email}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/profile/edit" className="btn-secondary px-4 py-2 text-sm">
                Edit public profile
              </Link>
              <form action={signOut}>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition hover:border-[#C98B72] hover:bg-[#F7E9E2] hover:text-[#8B3D1F]">
                  <LogOut className="size-3.5" aria-hidden /> Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Toggle({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <span className="relative mt-0.5 inline-flex shrink-0">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-sage-dark" aria-hidden />
      <span
        aria-hidden
        className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
      />
    </span>
  );
}
