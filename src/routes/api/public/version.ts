import { createFileRoute } from '@tanstack/react-router';

// Public, non-sensitive: returns only the id of the currently deployed build.
export const Route = createFileRoute('/api/public/version')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { buildId: __APP_BUILD_ID__ },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        ),
    },
  },
});
