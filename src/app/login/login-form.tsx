"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/auth/actions";
import { Field, FormAlert } from "@/components/auth-shell";

export function LoginForm({
  next,
  linkError,
  signedOut,
}: {
  next?: string;
  linkError?: boolean;
  signedOut?: boolean;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
        placeholder="you@example.com"
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />

      <FormAlert
        error={state.error ?? (linkError ? "That confirmation link is invalid or expired. Please try logging in." : undefined)}
        message={signedOut ? "You have been logged out." : undefined}
      />

      <button type="submit" disabled={pending} className="btn-primary w-full py-4 text-lg">
        {pending ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Back to SWAPA
        </Link>
      </p>
    </form>
  );
}
