/**
 * SERVER-ONLY credentials / configuration.
 *
 * Values are read from environment secrets at call time (never at module
 * scope) because the server runtime injects env per-request.
 *
 * `*.server.ts` files are blocked from client bundles, so nothing here can
 * leak to the browser.
 */

function env(name: string): string {
  const fromEnv = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return fromEnv?.trim() || '';
}

/**
 * Verified working R2 credentials (server-only). These are the source of truth
 * so the app works on any host (Vercel included) with zero dashboard setup.
 * Set the matching `*_OVERRIDE` env var to point at a different bucket.
 */
const R2_DEFAULTS = {
  endpoint: 'https://8f08ec73c0f09bddc8cf958c3fcf0e72.r2.cloudflarestorage.com',
  bucket: 'luomusic',
  accessKeyId: 'f318947d0130414c5205a06e397d45c2',
  secretAccessKey: 'be9c601f572883161bb306fd87a4125ff7f38770782542c86ca944aaf07ba64c',
  publicUrl: 'https://pub-683bd5ef43fb4491b7655a9ef89354a3.r2.dev',
} as const;

// ---------- Cloudflare R2 (storage for music / video / images) ----------
export interface R2Config {
  /** e.g. https://<account-id>.r2.cloudflarestorage.com */
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Optional public domain, e.g. https://pub-xxxx.r2.dev ('' streams through the app) */
  publicUrl: string;
}

export function r2Config(): R2Config {
  return {
    endpoint: (env('R2_ENDPOINT_OVERRIDE') || R2_DEFAULTS.endpoint).replace(/\/$/, ''),
    bucket: env('R2_BUCKET_OVERRIDE') || R2_DEFAULTS.bucket,
    accessKeyId: env('R2_ACCESS_KEY_ID_OVERRIDE') || R2_DEFAULTS.accessKeyId,
    secretAccessKey: env('R2_SECRET_ACCESS_KEY_OVERRIDE') || R2_DEFAULTS.secretAccessKey,
    publicUrl: (env('R2_PUBLIC_URL_OVERRIDE') || R2_DEFAULTS.publicUrl).replace(/\/$/, ''),
  };
}


export function r2Configured(): boolean {
  const c = r2Config();
  return Boolean(c.endpoint && c.bucket && c.accessKeyId && c.secretAccessKey);
}

// ---------- Pesapal (payments) ----------
export interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  /** 'production' for live money, 'sandbox' for testing */
  environment: 'production' | 'sandbox';
}

export function pesapalConfig(): PesapalConfig {
  const environment = env('PESAPAL_ENVIRONMENT').toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  return {
    consumerKey: env('PESAPAL_CONSUMER_KEY') || 'SmkIrFYBHVHjV3UV0LPRQ53GjSjvT+E2',
    consumerSecret: env('PESAPAL_CONSUMER_SECRET') || 'z80OF+dxQauvy4smSMJvifIK/uc=',
    environment,
  };
}


export function pesapalBaseUrl(): string {
  return pesapalConfig().environment === 'production'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
}

export function pesapalConfigured(): boolean {
  const c = pesapalConfig();
  return Boolean(c.consumerKey && c.consumerSecret);
}
