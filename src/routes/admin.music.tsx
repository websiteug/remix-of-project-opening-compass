import { createFileRoute } from "@tanstack/react-router";
import AdminMusic from "@/pages/admin/AdminMusic";

export const Route = createFileRoute("/admin/music")({
  head: () => ({ meta: [
    { title: 'Manage Music | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage tracks and their selected genres on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Music | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage tracks and their selected genres on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminMusic,
});
