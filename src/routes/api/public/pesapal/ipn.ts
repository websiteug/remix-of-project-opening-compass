import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Pesapal calls this URL when a payment changes state. */
export const Route = createFileRoute('/api/public/pesapal/ipn')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      GET: async ({ request }) => handleIpn(request),
      POST: async ({ request }) => handleIpn(request),
    },
  },
});

async function handleIpn(request: Request) {
  try {
    let orderTrackingId = '';
    let orderMerchantReference = '';
    let orderNotificationType = '';

    if (request.method === 'GET') {
      const p = new URL(request.url).searchParams;
      orderTrackingId = p.get('OrderTrackingId') || '';
      orderMerchantReference = p.get('OrderMerchantReference') || '';
      orderNotificationType = p.get('OrderNotificationType') || '';
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, string>;
      orderTrackingId = body['OrderTrackingId'] || '';
      orderMerchantReference = body['OrderMerchantReference'] || '';
      orderNotificationType = body['OrderNotificationType'] || '';
    }

    if (!orderTrackingId) {
      return Response.json({ error: 'Missing OrderTrackingId', status: 400 }, {
        status: 400,
        headers: cors,
      });
    }

    const { getTransactionStatus } = await import('@/lib/pesapal.server');
    const status = await getTransactionStatus(orderTrackingId);
    const [paymentType, artistId] = orderMerchantReference.split('_');
    const isCompleted =
      status.status_code === 1 ||
      (status.payment_status_description || '').toUpperCase() === 'COMPLETED';

    console.log('[pesapal/ipn]', { orderTrackingId, orderMerchantReference, isCompleted });

    return Response.json(
      {
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200,
        paymentStatus: isCompleted ? 'COMPLETED' : status.payment_status_description,
        paymentType,
        artistId,
        amount: status.amount,
        currency: status.currency,
        paymentMethod: status.payment_method,
        confirmationCode: status.confirmation_code,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error('[pesapal/ipn]', err);
    return Response.json({ error: String(err), status: 500 }, { status: 500, headers: cors });
  }
}
