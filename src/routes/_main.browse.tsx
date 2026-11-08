import { createFileRoute } from "@tanstack/react-router";
import Browse from "@/pages/Browse";

export const Route = createFileRoute("/_main/browse")({
  head: () => ({ meta: [
    { title: 'Browse Music | LUO MUSIC STORE' },
    { name: 'description', content: 'Explore songs, music videos and Ugandan music genres.' },
    { property: 'og:title', content: 'Browse Music | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Explore songs, music videos and Ugandan music genres.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Browse,
});
