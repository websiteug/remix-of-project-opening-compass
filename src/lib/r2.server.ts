/** Server-only Cloudflare R2 (S3-compatible) helpers using AWS SigV4. */
import { r2Config } from './app-credentials.server';

const REGION = 'auto';
const SERVICE = 's3';

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signingKey(shortDate: string) {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${r2Config().secretAccessKey}`), shortDate);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

function stamps() {
  const dateStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return { dateStamp, shortDate: dateStamp.substring(0, 8) };
}

export function objectHost() {
  const c = r2Config();
  const url = new URL(c.endpoint);
  return { host: `${c.bucket}.${url.host}`, protocol: url.protocol };
}

export function objectKey(fileName: string, folder: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${folder || 'uploads'}/${Date.now()}_${safeName}`;
}

/** Public (or app-proxied) URL for a stored object. */
export function publicUrlForKey(key: string) {
  const c = r2Config();
  if (c.publicUrl) return `${c.publicUrl}/${key}`;
  const { host, protocol } = objectHost();
  return `${protocol}//${host}/${key}`;
}

/** Upload bytes straight to R2 from the server. */
export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { host, protocol } = objectHost();
  const url = `${protocol}//${host}/${key}`;
  const { dateStamp, shortDate } = stamps();
  const payloadHash = await sha256Hex(body);

  const headers: Record<string, string> = {
    host,
    'content-type': contentType || 'application/octet-stream',
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]!.trim()}`)
    .join('\n') + '\n';

  const canonicalRequest = ['PUT', `/${key}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hex(await hmac(await signingKey(shortDate), stringToSign));

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${r2Config().accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body as unknown as BodyInit,
  });

  if (!res.ok) throw new Error(`R2 upload failed (${res.status}): ${await res.text()}`);
  return publicUrlForKey(key);
}

/** Presigned PUT URL so the browser can upload big files directly to R2. */
export async function presignPut(key: string, contentType: string, expiresIn = 3600) {
  const { host, protocol } = objectHost();
  const { dateStamp, shortDate } = stamps();
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/aws4_request`;

  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${r2Config().accessKeyId}/${credentialScope}`,
    'X-Amz-Date': dateStamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  });

  const canonicalRequest = [
    'PUT',
    `/${key}`,
    params.toString(),
    `content-type:${contentType}\nhost:${host}\n`,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  params.set('X-Amz-Signature', hex(await hmac(await signingKey(shortDate), stringToSign)));

  return {
    presignedUrl: `${protocol}//${host}/${key}?${params.toString()}`,
    publicUrl: publicUrlForKey(key),
    key,
  };
}

/** Signed GET (used by the streaming proxy). Supports Range. */
export async function getObject(key: string, range?: string | null) {
  const { host, protocol } = objectHost();
  const { dateStamp, shortDate } = stamps();
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateStamp,
  };
  if (range) headers['range'] = range;

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]!.trim()}`)
    .join('\n') + '\n';

  const canonicalRequest = ['GET', `/${key}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${shortDate}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hex(await hmac(await signingKey(shortDate), stringToSign));

  return fetch(`${protocol}//${host}/${key}`, {
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${r2Config().accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });
}
