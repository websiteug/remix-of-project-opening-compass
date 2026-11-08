/**
 * SSR-safe site origin. On the server there is no `window`, so fall back to the
 * canonical production origin.
 */
export const FALLBACK_ORIGIN = "https://beat-creator-zone.lovable.app";

export function siteOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN;
}

export function siteHref(): string {
  return typeof window !== "undefined" ? window.location.href : FALLBACK_ORIGIN;
}
