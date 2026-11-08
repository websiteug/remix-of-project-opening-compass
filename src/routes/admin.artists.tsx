import { createFileRoute } from "@tanstack/react-router";
import AdminArtists from "@/pages/admin/AdminArtists";

export const Route = createFileRoute("/admin/artists")({
  head: () => ({ meta: [
    { title: 'Manage Artists | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage artist profiles on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Artists | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage artist profiles on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminArtists,
});
