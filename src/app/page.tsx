import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  Heart,
  Home as HomeIcon,
  Leaf,
  MapPin,
  MessageCircle,
  Recycle,
  ShieldCheck,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

const categories = [
  {
    name: "Clothing",
    description: "Clothes, shoes and accessories with plenty of life left.",
    Icon: Shirt,
    tint: "bg-[#DCE8DC]",
  },
  {
    name: "Books",
    description: "Books, textbooks and comics ready for their next reader.",
    Icon: BookOpen,
    tint: "bg-[#E9E4D6]",
  },
  {
    name: "Home",
    description: "Kitchenware, decor and household pieces for a fresh space.",
    Icon: HomeIcon,
    tint: "bg-[#E3E7DF]",
  },
];

const steps = [
  {
    n: "01",
    title: "Add your items",
    body: "Photograph something you no longer use. Add a title, condition and a short description.",
    Icon: Sparkles,
  },
  {
    n: "02",
    title: "Pick what to offer",
    body: "Choose one of your items and browse other people's items in the same category.",
    Icon: ArrowLeftRight,
  },
  {
    n: "03",
    title: "Swipe and match",
    body: "Like what you love. When you both like each other's item, it's a Match.",
    Icon: Heart,
  },
  {
    n: "04",
    title: "Chat and swap",
    body: "Agree on the exchange, meet safely and confirm when you've both swapped.",
    Icon: MessageCircle,
  },
];

const reasons = [
  { title: "Always free", body: "No payments, fees, commissions or premium tiers. Swapping is the whole point.", Icon: ShieldCheck },
  { title: "Local and human", body: "Meet people in your city and give useful things a second home.", Icon: MapPin },
  { title: "Less waste", body: "Every swap keeps clothing, books and homeware out of landfill.", Icon: Recycle },
];

export default async function LandingPage() {
  const user = await currentUser();
  if (user) {
    let onboarded = false;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      onboarded = Boolean(data?.onboarding_completed);
    } catch {
      onboarded = false;
    }
    redirect(onboarded ? "/discover" : "/onboarding");
  }

  return (
    <main className="overflow-x-clip bg-cream text-graphite">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Logo />
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#categories" className="hidden px-3 py-2 text-ink-soft hover:text-ink sm:inline">
              Categories
            </a>
            <a href="#how" className="hidden px-3 py-2 text-ink-soft hover:text-ink sm:inline">
              How it works
            </a>
            <a href="#why" className="hidden px-3 py-2 text-ink-soft hover:text-ink lg:inline">
              Why SWAPA
            </a>
            <Link href="/login" className="px-2 py-2 font-medium hover:text-sage-dark sm:px-3">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary px-4 py-2 text-sm sm:px-5">
              Start Swapping
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 18%, rgba(220,232,220,0.95), transparent 38%), radial-gradient(circle at 82% 10%, rgba(233,228,214,0.8), transparent 34%), radial-gradient(circle at 55% 80%, rgba(220,232,220,0.55), transparent 40%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-[1.08fr_0.92fr] md:pb-28 md:pt-20">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <ArrowLeftRight className="size-3.5" aria-hidden /> Free peer-to-peer item exchange
            </p>
            <h1 className="mt-6 font-display text-[clamp(3.1rem,7vw,6.2rem)] leading-[0.9] tracking-[-0.035em]">
              Swap what you have.
              <br />
              <em className="font-normal italic text-sage-dark">Find what you love.</em>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft">
              Give your things a new home. Discover something new. Exchange items with people in
              your city — completely free.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-7 py-4 text-lg">
                Start Swapping <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href="#how" className="btn-secondary px-7 py-4 text-lg">
                How It Works
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
              {["No fees. Ever.", "Three simple categories", "Local exchanges"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-sage text-sage-dark">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero card stack */}
          <div className="relative mx-auto h-[420px] w-full max-w-[390px] sm:h-[470px]">
            <div aria-hidden className="absolute inset-x-8 bottom-4 top-16 rotate-6 rounded-[30px] bg-sage/70" />
            <div aria-hidden className="absolute inset-x-10 bottom-8 top-20 -rotate-3 rounded-[30px] bg-white/60" />
            <article className="absolute left-2 top-6 w-[86%] -rotate-6 rounded-[26px] bg-white p-5 shadow-[0_30px_70px_-30px_rgba(48,58,50,0.45)]">
              <div className="h-40 rounded-[18px] bg-[#E9E4D6]" aria-hidden>
                <div className="grid h-full place-items-center text-[#8A8168]">
                  <BookOpen className="size-14" strokeWidth={1.2} />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Books</p>
                  <h3 className="mt-1 font-display text-2xl leading-tight">Art & design books</h3>
                </div>
                <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-medium">Good</span>
              </div>
            </article>
            <article className="absolute bottom-4 right-0 w-[88%] rotate-3 rounded-[26px] bg-white p-5 shadow-[0_34px_80px_-28px_rgba(48,58,50,0.5)]">
              <div className="h-44 rounded-[18px] bg-sage" aria-hidden>
                <div className="grid h-full place-items-center text-sage-dark">
                  <Shirt className="size-16" strokeWidth={1.2} />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Clothing</p>
                  <h3 className="mt-1 font-display text-2xl leading-tight">Linen overshirt</h3>
                </div>
                <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-medium">Like New</span>
              </div>
            </article>
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-2xl border-4 border-sage-dark bg-cream/95 px-5 py-2 font-display text-3xl font-semibold italic text-sage-dark shadow-lg">
              It&apos;s a Match
            </div>
            <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-white text-ink shadow-lg">
                <X className="size-5" aria-hidden />
              </span>
              <span className="grid size-12 place-items-center rounded-full bg-sage-dark text-white shadow-lg">
                <Heart className="size-5" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-y border-line bg-sage-dark py-4 text-white">
        <div className="flex w-max gap-10 whitespace-nowrap font-display text-2xl italic marquee">
          {[...Array(2)].map((_, loop) => (
            <span key={loop} className="flex items-center gap-10">
              {["Swap more", "Buy less", "Keep it local", "Give things a second life", "Always free"].map((word) => (
                <span key={word} className="flex items-center gap-10">
                  {word} <Leaf className="size-5 shrink-0 text-sage" aria-hidden />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <section id="categories" className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Three categories</p>
          <h2 className="mt-4 font-display text-[clamp(2.3rem,5vw,4rem)] leading-[0.95] tracking-tight">
            Simple by design.
          </h2>
          <p className="mt-5 text-lg text-ink-soft">
            SWAPA keeps exchanges focused. You can swap within the same category, so a jacket finds
            a jacket and a book finds a book.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {categories.map(({ name, description, Icon, tint }) => (
            <article key={name} className="rounded-[26px] border border-line bg-white/70 p-6">
              <div className={`grid h-40 place-items-center rounded-[20px] ${tint}`}>
                <Icon className="size-16 text-sage-dark" strokeWidth={1.2} aria-hidden />
              </div>
              <h3 className="mt-6 font-display text-3xl">{name}</h3>
              <p className="mt-2 text-ink-soft">{description}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Clothing ↔ Clothing · Books ↔ Books · Home ↔ Home
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-line bg-white/45 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 font-display text-[clamp(2.3rem,5vw,4rem)] leading-[0.95] tracking-tight">
              From closet to <em className="italic text-sage-dark">connection.</em>
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, title, body, Icon }) => (
              <article key={n} className="rounded-[24px] border border-line bg-cream p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-sage text-sage-dark">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-ink-soft">{n}</span>
                </div>
                <h3 className="mt-6 font-display text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Why SWAPA</p>
            <h2 className="mt-4 font-display text-[clamp(2.3rem,5vw,4rem)] leading-[0.95] tracking-tight">
              A calmer way to <em className="italic text-sage-dark">refresh.</em>
            </h2>
            <p className="mt-5 text-lg text-ink-soft">
              No listings to price, no payments to process, no algorithm pushing you to buy more.
              Just people exchanging things they no longer need.
            </p>
          </div>
          <div className="grid gap-4">
            {reasons.map(({ title, body, Icon }) => (
              <article key={title} className="flex gap-5 rounded-[24px] border border-line bg-white/70 p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sage text-sage-dark">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-2xl">{title}</h3>
                  <p className="mt-1 text-ink-soft">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SUSTAINABILITY */}
      <section className="bg-graphite py-24 text-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cream/50">Sustainability</p>
            <h2 className="mt-4 font-display text-[clamp(2.3rem,5vw,4rem)] leading-[0.95] tracking-tight">
              The most sustainable item is the one already made.
            </h2>
            <p className="mt-6 max-w-xl text-lg text-cream/70">
              Every exchange extends the life of something useful. SWAPA makes reuse feel less like
              a compromise and more like a good habit.
            </p>
            <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-graphite transition hover:bg-cream">
              Join the swap <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["1 item", "gets a second life"],
              ["0 fees", "always and forever"],
              ["3 categories", "focused and simple"],
              ["1 city", "local connections"],
            ].map(([big, small]) => (
              <div key={big} className="rounded-[22px] border border-cream/15 bg-cream/5 p-5">
                <p className="font-display text-3xl">{big}</p>
                <p className="mt-1 text-sm text-cream/60">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative isolate overflow-hidden py-28">
        <div aria-hidden className="absolute inset-0 -z-10 bg-sage/60" />
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="eyebrow justify-center">Start today</p>
          <h2 className="mt-4 font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.92] tracking-tight">
            Your next favourite thing is already out there.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">
            Create a free profile, add one item, and start discovering.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary px-8 py-4 text-lg">
              Start Swapping <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-4 text-lg">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-ink-soft">
              Swap what you have. Find what you love. A free peer-to-peer item exchange.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            <a href="#categories" className="hover:text-ink">Categories</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <Link href="/signup" className="hover:text-ink">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
