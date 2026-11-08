import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { restListDocs } from "@/lib/firestoreRest";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/music", changefreq: "daily", priority: "0.9" },
          { path: "/videos", changefreq: "daily", priority: "0.9" },
          { path: "/artists", changefreq: "daily", priority: "0.9" },
          { path: "/genres", changefreq: "weekly", priority: "0.7" },
          { path: "/browse", changefreq: "weekly", priority: "0.7" },
          { path: "/recently-added", changefreq: "daily", priority: "0.7" },
          { path: "/reels", changefreq: "weekly", priority: "0.6" },
        ];

        const [tracks, videos, artists] = await Promise.all([
          restListDocs<{ title?: string }>("tracks"),
          restListDocs<{ title?: string }>("videos"),
          restListDocs<{ name?: string }>("artists"),
        ]);

        for (const t of tracks) entries.push({ path: `/play/${t.id}`, changefreq: "weekly", priority: "0.8" });
        for (const v of videos) entries.push({ path: `/video/${v.id}`, changefreq: "weekly", priority: "0.8" });
        for (const a of artists) entries.push({ path: `/artist/${a.id}`, changefreq: "weekly", priority: "0.8" });

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${origin}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
