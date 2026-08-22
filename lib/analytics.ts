import posthog from "posthog-js";

export type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: Record<string, AnalyticsValue> = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", name, params);

  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(name, params);
  }
}
