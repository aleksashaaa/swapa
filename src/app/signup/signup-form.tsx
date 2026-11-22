"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signUp, type AuthState } from "@/app/auth/actions";
import { Field, FormAlert } from "@/components/auth-shell";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});

  if (state.message) {
    return (
      <div className="space-y-6">
        <FormAlert message={state.message} />
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium underline decoration-sage-dark decoration-2 underline-offset-4">
          Go to login <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={state.fields?.fullName}
        placeholder="Alex Morgan"
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="Use at least 8 characters."
      />

      <FormAlert error={state.error} />

      <button type="submit" disabled={pending} className="btn-primary w-full py-4 text-lg">
        {pending ? "Creating your account…" : "Create free account"}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-soft">
        By joining you agree to keep SWAPA friendly, legal and free of prohibited items.
      </p>
    </form>
  );
}
