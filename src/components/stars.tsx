import { Star } from "lucide-react";

export function Stars({ value, size = "size-3.5" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? "fill-sage-dark text-sage-dark" : "text-line"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}
