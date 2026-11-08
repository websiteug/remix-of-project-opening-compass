import { createFileRoute } from "@tanstack/react-router";
import ArtistDashboard from "@/pages/ArtistDashboard";

export const Route = createFileRoute("/_main/dashboard")({
  head: () => ({ meta: [
    { title: 'Artist Dashboard | LUO MUSIC STORE' },
    { name: 'description', content: 'Upload and manage your music and videos on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Artist Dashboard | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Upload and manage your music and videos on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ArtistDashboard,
});
