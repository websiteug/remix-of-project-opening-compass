// Pesapal payment service — talks to this app's own server endpoints.

export interface PesapalToken {
  token: string;
  expiryDate: string;
}

export interface PesapalOrderResponse {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

export interface PesapalStatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'INVALID' | 'REVERSED';
  statusCode: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  confirmationCode?: string;
  merchantReference?: string;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Get Pesapal auth token
export async function getPesapalToken(): Promise<PesapalToken> {
  return postJson<PesapalToken>('/api/public/pesapal/auth');
}

// Register the IPN URL with Pesapal
export async function registerIpnUrl(token: string, ipnUrl: string): Promise<string> {
  const data = await postJson<{ ipnId: string }>('/api/public/pesapal/register-ipn', {
    token,
    ipnUrl,
  });
  return data.ipnId;
}

// Submit order to Pesapal
export async function submitPesapalOrder(params: {
  token: string;
  merchantReference: string;
  amount: number;
  currency?: string;
  description: string;
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  callbackUrl: string;
  cancellationUrl?: string;
  notificationId: string;
  paymentType: 'subscription' | 'hero_slide';
}): Promise<PesapalOrderResponse> {
  return postJson<PesapalOrderResponse>('/api/public/pesapal/submit-order', params);
}

// Check payment status
export async function checkPesapalStatus(
  token: string,
  orderTrackingId: string,
): Promise<PesapalStatusResponse> {
  return postJson<PesapalStatusResponse>('/api/public/pesapal/check-status', {
    token,
    orderTrackingId,
  });
}

// Generate merchant reference
export function generateMerchantReference(type: 'SUB' | 'HERO', artistId: string): string {
  const timestamp = Date.now();
  return `${type}_${artistId.substring(0, 10)}_${timestamp}`;
}

// Get stored IPN ID or register a new one
let cachedIpnId: string | null = null;

export async function getOrCreateIpnId(): Promise<string> {
  if (cachedIpnId) return cachedIpnId;

  const stored = typeof window !== 'undefined' ? localStorage.getItem('pesapal_ipn_id') : null;
  if (stored) {
    cachedIpnId = stored;
    return stored;
  }

  const token = await getPesapalToken();
  const ipnUrl = `${window.location.origin}/api/public/pesapal/ipn`;
  const ipnId = await registerIpnUrl(token.token, ipnUrl);

  localStorage.setItem('pesapal_ipn_id', ipnId);
  cachedIpnId = ipnId;

  return ipnId;
}

// Poll for payment status
export async function pollPaymentStatus(
  orderTrackingId: string,
  maxAttempts = 60,
  intervalMs = 3000,
): Promise<PesapalStatusResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const token = await getPesapalToken();
    const status = await checkPesapalStatus(token.token, orderTrackingId);

    console.log('[PesapalPoll] Status:', status.status, 'Attempt:', attempts + 1);

    if (status.status === 'COMPLETED') return status;

    if (status.status === 'FAILED' || status.status === 'INVALID' || status.status === 'REVERSED') {
      throw new Error(`Payment ${status.status.toLowerCase()}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new Error('Payment confirmation timeout. Please check your phone and try again.');
}
