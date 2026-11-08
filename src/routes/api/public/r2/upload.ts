import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/r2/upload')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      POST: async () => Response.json(
        {
          error: 'This endpoint is disabled. Request a presigned URL and upload directly to R2.',
        },
        { status: 410, headers: cors },
      ),
    },
  },
});
