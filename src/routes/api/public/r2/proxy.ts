import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

export const Route = createFileRoute('/api/public/r2/proxy')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      GET: async ({ request }) => {
        const { r2Configured } = await import('@/lib/app-credentials.server');
        if (!r2Configured()) {
          return new Response('Storage not configured', { status: 500, headers: cors });
        }
        const key = new URL(request.url).searchParams.get('key');
        if (!key) return new Response("Missing 'key'", { status: 400, headers: cors });

        try {
          const { getObject } = await import('@/lib/r2.server');
          const upstream = await getObject(key, request.headers.get('range'));
          const headers = new Headers(cors);
          for (const h of [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'etag',
            'last-modified',
          ]) {
            const v = upstream.headers.get(h);
            if (v) headers.set(h, v);
          }
          headers.set('cache-control', 'public, max-age=31536000, immutable');
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch (err) {
          console.error('[r2/proxy]', err);
          return new Response('Proxy error', { status: 500, headers: cors });
        }
      },
    },
  },
});
