import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OrderInput {
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
  token?: string;
}

export const Route = createFileRoute('/api/public/pesapal/submit-order')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      POST: async ({ request }) => {
        const { pesapalBaseUrl, pesapalConfigured } = await import(
          '@/lib/app-credentials.server'
        );
        if (!pesapalConfigured()) {
          return Response.json(
            { error: 'Payments are not configured yet.' },
            { status: 500, headers: cors },
          );
        }
        try {
          const body = (await request.json()) as OrderInput;
          if (!body.merchantReference || !body.amount || !body.callbackUrl || !body.notificationId) {
            return Response.json({ error: 'Missing order fields' }, { status: 400, headers: cors });
          }
          const { getPesapalToken } = await import('@/lib/pesapal.server');
          const token = body.token || (await getPesapalToken());

          const res = await fetch(`${pesapalBaseUrl()}/api/Transactions/SubmitOrderRequest`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: body.merchantReference,
              currency: body.currency || 'KES',
              amount: body.amount,
              description: body.description,
              callback_url: body.callbackUrl,
              cancellation_url: body.cancellationUrl || body.callbackUrl,
              notification_id: body.notificationId,
              billing_address: {
                email_address: body.email || '',
                phone_number: body.phoneNumber || '',
                first_name: body.firstName || '',
                last_name: body.lastName || '',
              },
            }),
          });

          const data = (await res.json()) as {
            order_tracking_id?: string;
            merchant_reference?: string;
            redirect_url?: string;
            error?: { message?: string } | string;
          };
          if (data.error || !data.redirect_url) {
            const msg =
              typeof data.error === 'string'
                ? data.error
                : data.error?.message || 'Failed to create payment order';
            return Response.json({ error: msg }, { status: 400, headers: cors });
          }
          return Response.json(
            {
              orderTrackingId: data.order_tracking_id,
              merchantReference: data.merchant_reference,
              redirectUrl: data.redirect_url,
            },
            { headers: cors },
          );
        } catch (err) {
          console.error('[pesapal/submit-order]', err);
          return Response.json({ error: String(err) }, { status: 500, headers: cors });
        }
      },
    },
  },
});
