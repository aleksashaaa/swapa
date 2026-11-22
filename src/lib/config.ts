// Server-only configuration. Do not import from client components.
export const SKIP_COOLDOWN_HOURS = Math.max(
  0,
  Number.parseInt(process.env.SKIP_COOLDOWN_HOURS ?? "24", 10) || 24,
);

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
