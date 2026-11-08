/** Server-only Pesapal helpers. */
import { pesapalConfig, pesapalBaseUrl } from './app-credentials.server';

export async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${pesapalBaseUrl()}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumer_key: pesapalConfig().consumerKey,
      consumer_secret: pesapalConfig().consumerSecret,
    }),
  });
  const data = (await res.json()) as { token?: string; error?: { message?: string } };
  if (!data.token) throw new Error(data.error?.message || 'Pesapal auth failed');
  return data.token;
}

export interface PesapalTransactionStatus {
  status_code?: number;
  payment_status_description?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  confirmation_code?: string;
  merchant_reference?: string;
  error?: { code?: string; message?: string } | null;
}

export async function getTransactionStatus(
  orderTrackingId: string,
  token?: string,
): Promise<PesapalTransactionStatus> {
  const bearer = token || (await getPesapalToken());
  const res = await fetch(
    `${pesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
    },
  );
  return (await res.json()) as PesapalTransactionStatus;
}

export async function registerIpn(ipnUrl: string, token?: string): Promise<string> {
  const bearer = token || (await getPesapalToken());
  const res = await fetch(`${pesapalBaseUrl()}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'GET' }),
  });
  const data = (await res.json()) as { ipn_id?: string; error?: { message?: string } };
  if (!data.ipn_id) throw new Error(data.error?.message || 'Failed to register IPN URL');
  return data.ipn_id;
}
