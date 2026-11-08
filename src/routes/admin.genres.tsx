import { createFileRoute } from "@tanstack/react-router";
import AdminGenres from "@/pages/admin/AdminGenres";

export const Route = createFileRoute("/admin/genres")({
  head: () => ({ meta: [
    { title: 'Manage Genres | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage music genre entries on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Genres | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage music genre entries on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminGenres,
});
