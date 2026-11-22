import Link from "next/link";

export function Logo({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="SWAPA home"
      className={`inline-flex items-center gap-2.5 ${inverted ? "text-paper" : "text-ink"} ${className}`}
    >
      <span
        aria-hidden
        className={`grid size-9 place-items-center rounded-full ${inverted ? "bg-paper/10" : "bg-sage"}`}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 8.5h12.5m0 0-3.2-3.2M16.5 8.5l-3.2 3.2M20 15.5H7.5m0 0 3.2-3.2M7.5 15.5l3.2 3.2"
            stroke={inverted ? "#F8F7F2" : "#718A75"}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[1.6rem] font-semibold tracking-tight">swapa</span>
    </Link>
  );
}
