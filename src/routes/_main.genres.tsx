import { createFileRoute } from "@tanstack/react-router";
import Genres from "@/pages/Genres";

export const Route = createFileRoute("/_main/genres")({
  head: () => ({ meta: [
    { title: 'Ugandan Music Genres | LUO MUSIC STORE' },
    { name: 'description', content: 'Browse Rumba, Kadongo Kamu, Kidandali and more Ugandan music styles.' },
    { property: 'og:title', content: 'Ugandan Music Genres | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Browse Rumba, Kadongo Kamu, Kidandali and more Ugandan music styles.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Genres,
});
