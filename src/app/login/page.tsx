import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signed_out?: string }>;
}) {
  const { next, error, signed_out } = await searchParams;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Good things are <em className="italic text-sage-dark">waiting.</em>
        </>
      }
      aside={
        <div className="max-w-sm space-y-4">
          {[
            { Icon: Sparkles, text: "Discover items from people near you" },
            { Icon: Heart, text: "Like what you love. Match when it's mutual" },
            { Icon: ShieldCheck, text: "Chat safely and agree on the swap" },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-4 rounded-2xl border border-cream/15 px-5 py-4">
              <span className="grid size-10 place-items-center rounded-full bg-sage/15 text-sage">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-cream/80">{text}</p>
            </div>
          ))}
        </div>
      }
    >
      <LoginForm next={next} linkError={error === "auth_callback"} signedOut={signed_out === "1"} />
      <p className="mt-8 text-center text-sm text-ink-soft">
        New to SWAPA?{" "}
        <Link href="/signup" className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-sage-dark decoration-2 underline-offset-4">
          Create a free account <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </p>
    </AuthShell>
  );
}
