import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/pesapal/check-status')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      POST: async ({ request }) => {
        const { pesapalConfigured } = await import('@/lib/app-credentials.server');
        if (!pesapalConfigured()) {
          return Response.json(
            { error: 'Payments are not configured yet.' },
            { status: 500, headers: cors },
          );
        }
        try {
          const body = (await request.json()) as { orderTrackingId?: string; token?: string };
          if (!body.orderTrackingId) {
            return Response.json(
              { error: 'orderTrackingId is required' },
              { status: 400, headers: cors },
            );
          }
          const { getTransactionStatus } = await import('@/lib/pesapal.server');
          const s = await getTransactionStatus(body.orderTrackingId, body.token);
          const errCode = (s.error as { code?: string } | undefined)?.code;
          const errMsg = s.error?.message;
          // Pesapal returns an "error" while the buyer is still on the iframe.
          // Treat those as PENDING instead of failing the whole poll.
          const pendingCodes = ['payment_details_not_found', 'pending_payment'];
          const isPending =
            !!(errCode && pendingCodes.includes(errCode)) ||
            !!(errMsg && /pending/i.test(errMsg));
          if ((errCode || errMsg) && !isPending) {
            return Response.json(
              { error: errMsg || errCode || 'Status check failed' },
              { status: 400, headers: cors },
            );
          }
          if (isPending) {
            return Response.json(
              {
                status: 'PENDING',
                statusCode: 0,
                amount: s.amount ?? 0,
                currency: s.currency ?? 'KES',
                merchantReference: s.merchant_reference,
              },
              { headers: cors },
            );
          }
          const desc = (s.payment_status_description || 'PENDING').toUpperCase();
          const status =
            s.status_code === 1 || desc === 'COMPLETED'
              ? 'COMPLETED'
              : desc === 'FAILED' || desc === 'INVALID' || desc === 'REVERSED'
                ? desc
                : 'PENDING';
          return Response.json(
            {
              status,
              statusCode: s.status_code ?? 0,
              amount: s.amount ?? 0,
              currency: s.currency ?? 'KES',
              paymentMethod: s.payment_method,
              confirmationCode: s.confirmation_code,
              merchantReference: s.merchant_reference,
            },
            { headers: cors },
          );
        } catch (err) {
          console.error('[pesapal/check-status]', err);
          return Response.json({ error: String(err) }, { status: 500, headers: cors });
        }
      },
    },
  },
});
