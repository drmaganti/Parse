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

export function identifyAnalyticsUser(userId: string) {
  if (typeof window === "undefined" || !userId || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  // Use the stable auth UID rather than an email address or other PII.
  posthog.identify(userId);
}

export function resetAnalyticsUser() {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}
