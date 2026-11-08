import { createFileRoute } from "@tanstack/react-router";
import AdminVideos from "@/pages/admin/AdminVideos";

export const Route = createFileRoute("/admin/videos")({
  head: () => ({ meta: [
    { title: 'Manage Videos | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage music videos and their selected genres on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Videos | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage music videos and their selected genres on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminVideos,
});
