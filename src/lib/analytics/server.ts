import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

function getClient() {
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  client = key
    ? new PostHog(key, { host: "https://eu.i.posthog.com", flushAt: 1, flushInterval: 0 })
    : null;
  return client;
}

export async function captureServer(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
) {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (error) {
    console.error("posthog capture failed", event, error);
  }
}
