import { createFileRoute } from "@tanstack/react-router";
import Favourites from "@/pages/Favourites";

export const Route = createFileRoute("/_main/favourites")({
  head: () => ({ meta: [
    { title: 'Favourite Songs | LUO MUSIC STORE' },
    { name: 'description', content: 'Your favourite tracks and music videos in one place.' },
    { property: 'og:title', content: 'Favourite Songs | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Your favourite tracks and music videos in one place.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Favourites,
});
