import { createFileRoute } from '@tanstack/react-router';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const Route = createFileRoute('/api/public/r2/presign')({
  server: {
    handlers: {
      OPTIONS: () => new Response('ok', { headers: cors }),
      POST: async ({ request }) => {
        const { r2Configured } = await import('@/lib/app-credentials.server');
        if (!r2Configured()) {
          return Response.json(
            { error: 'Storage is not configured yet.' },
            { status: 500, headers: cors },
          );
        }
        try {
          const body = (await request.json()) as {
            fileName?: string;
            fileType?: string;
            folder?: string;
          };
          if (!body.fileName || !body.fileType) {
            return Response.json(
              { error: 'fileName and fileType are required' },
              { status: 400, headers: cors },
            );
          }
          const { presignPut, objectKey } = await import('@/lib/r2.server');
          const key = objectKey(body.fileName, body.folder || 'uploads');
          const result = await presignPut(key, body.fileType);
          return Response.json({ ...result, contentType: body.fileType }, { headers: cors });
        } catch (err) {
          console.error('[r2/presign]', err);
          return Response.json({ error: String(err) }, { status: 500, headers: cors });
        }
      },
    },
  },
});
