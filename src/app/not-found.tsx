import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-16">
      <div className="max-w-lg text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="eyebrow mt-10">404</p>
        <h1 className="mt-3 font-display text-[clamp(2.8rem,8vw,5rem)] leading-[0.92] tracking-tight">
          This page has already <em className="italic text-sage-dark">swapped hands.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          The item, match or page you&apos;re looking for may have been removed, completed or never
          existed.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/discover" className="btn-primary px-6 py-3">
            <Compass className="size-4" aria-hidden /> Discover
          </Link>
          <Link href="/" className="btn-secondary px-6 py-3">
            <Home className="size-4" aria-hidden /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
