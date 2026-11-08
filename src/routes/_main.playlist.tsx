import { createFileRoute } from "@tanstack/react-router";
import Playlist from "@/pages/Playlist";

export const Route = createFileRoute("/_main/playlist")({
  head: () => ({ meta: [
    { title: 'Your Playlist | LUO MUSIC STORE' },
    { name: 'description', content: 'Listen to and manage your music playlist.' },
    { property: 'og:title', content: 'Your Playlist | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Listen to and manage your music playlist.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Playlist,
});
