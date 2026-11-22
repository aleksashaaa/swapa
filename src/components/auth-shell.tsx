import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthShell({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-cream md:grid-cols-[1fr_1.05fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-graphite p-10 text-cream md:flex">
        <div aria-hidden className="absolute -right-24 top-10 size-72 rounded-full bg-sage/20 blur-2xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 size-80 rounded-full bg-sage-dark/30 blur-3xl" />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative">{aside}</div>
        <p className="relative text-xs uppercase tracking-[0.18em] text-cream/40">
          Free exchanges · No fees · Local people
        </p>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between md:hidden">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-soft">
            <ArrowLeft className="size-3.5" aria-hidden /> Home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight">{title}</h1>
          <div className="mt-9">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input {...props} className="field mt-2" />
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-[#C98B72]/40 bg-[#F7E9E2] px-4 py-3 text-sm text-[#8B3D1F]">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-xl border border-sage-dark/30 bg-sage/50 px-4 py-3 text-sm text-graphite">
        {message}
      </p>
    );
  }
  return null;
}
