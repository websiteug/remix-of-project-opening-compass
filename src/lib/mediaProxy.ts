// Helper to convert stored media URLs into publicly streamable URLs.
//
// Media lives in Cloudflare R2 and is served from the bucket's public domain,
// so bytes go browser -> Cloudflare directly (no server bandwidth involved).

const FALLBACK_IMAGE = '/placeholder-cover.png';

/** Public R2 domain for the media bucket (safe to expose - it is public). */
const R2_PUBLIC_BASE = 'https://pub-683bd5ef43fb4491b7655a9ef89354a3.r2.dev';

function fromKey(key: string): string {
  const clean = key.replace(/^\/+/, '');
  const encoded = clean.split('/').map(encodeURIComponent).join('/');
  return `${R2_PUBLIC_BASE}/${encoded}`;
}

/**
 * Converts a stored media URL into a directly playable public URL.
 * - Legacy proxy URLs (`/api/public/r2/proxy?key=...`) are rewritten.
 * - S3-style R2 endpoint URLs are rewritten to the public domain.
 * - Anything else (already public, external, data URI) is returned as-is.
 */
export function getProxiedUrl(url: string | undefined): string {
  if (!url || url.trim() === '') return FALLBACK_IMAGE;

  // Legacy proxy URLs -> public domain
  if (url.includes('/api/public/r2/proxy') || url.includes('/functions/v1/r2-proxy')) {
    try {
      const u = new URL(url, 'http://local');
      const key = u.searchParams.get('key');
      if (key) return fromKey(key);
    } catch {
      /* fall through */
    }
    return url;
  }

  // Already on the public R2 domain
  if (url.includes('.r2.dev')) return url;

  // Private S3-style endpoint -> public domain
  if (url.includes('r2.cloudflarestorage.com')) {
    try {
      const urlObj = new URL(url);
      // strip a leading bucket segment if present in path-style URLs
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const key = decodeURIComponent(parts.join('/'));
      if (key) return fromKey(key);
    } catch {
      return url;
    }
  }

  return url;
}
