import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/pesapal/auth')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      POST: async () => {
        const { pesapalConfig, pesapalBaseUrl, pesapalConfigured } = await import(
          '@/lib/app-credentials.server'
        );
        if (!pesapalConfigured()) {
          return Response.json(
            { error: 'Payments are not configured yet.' },
            { status: 500, headers: cors },
          );
        }
        try {
          const res = await fetch(`${pesapalBaseUrl()}/api/Auth/RequestToken`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consumer_key: pesapalConfig().consumerKey,
              consumer_secret: pesapalConfig().consumerSecret,
            }),
          });
          const data = (await res.json()) as {
            token?: string;
            expiryDate?: string;
            error?: { code?: string; message?: string };
          };
          if (data.error || !data.token) {
            const msg =
              data.error?.code === 'invalid_consumer_key_or_secret_provided'
                ? 'Invalid Pesapal credentials. Check the consumer key/secret and that they match the environment (sandbox vs production).'
                : data.error?.message || 'Failed to get Pesapal token';
            return Response.json({ error: msg }, { status: 400, headers: cors });
          }
          return Response.json(
            { token: data.token, expiryDate: data.expiryDate },
            { headers: cors },
          );
        } catch (err) {
          console.error('[pesapal/auth]', err);
          return Response.json({ error: String(err) }, { status: 500, headers: cors });
        }
      },
    },
  },
});
