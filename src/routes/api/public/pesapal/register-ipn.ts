import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/pesapal/register-ipn')({
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
          const body = (await request.json().catch(() => ({}))) as {
            ipnUrl?: string;
            token?: string;
          };
          const ipnUrl = body.ipnUrl || new URL('/api/public/pesapal/ipn', request.url).toString();
          const { registerIpn } = await import('@/lib/pesapal.server');
          const ipnId = await registerIpn(ipnUrl, body.token);
          return Response.json({ ipnId, ipnUrl }, { headers: cors });
        } catch (err) {
          console.error('[pesapal/register-ipn]', err);
          return Response.json({ error: String(err) }, { status: 500, headers: cors });
        }
      },
    },
  },
});
