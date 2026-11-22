import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Join SWAPA"
      title={
        <>
          Give your things a <em className="italic text-sage-dark">new story.</em>
        </>
      }
      aside={
        <div className="max-w-sm">
          <blockquote>
            <p className="font-display text-4xl leading-tight">
              “I swapped a jacket I never wore for a book I&apos;ll keep forever.”
            </p>
            <footer className="mt-6 text-xs uppercase tracking-[0.2em] text-cream/50">
              A SWAPA member
            </footer>
          </blockquote>
          <ul className="mt-8 space-y-3 text-sm text-cream/70">
            {["Always free", "No commissions", "Local, human exchanges"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-sage/20 text-sage">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <SignupForm />
      <p className="mt-8 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-sage-dark decoration-2 underline-offset-4">
          Log in <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </p>
    </AuthShell>
  );
}
