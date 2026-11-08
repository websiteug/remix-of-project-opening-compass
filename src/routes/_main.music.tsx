import { createFileRoute } from "@tanstack/react-router";
import Music from "@/pages/Music";

export const Route = createFileRoute("/_main/music")({
  head: () => ({ meta: [
    { title: 'Music | LUO MUSIC STORE' },
    { name: 'description', content: 'Stream and download the latest Luo, Acholi and Ugandan songs.' },
    { property: 'og:title', content: 'Music | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Stream and download the latest Luo, Acholi and Ugandan songs.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Music,
});
