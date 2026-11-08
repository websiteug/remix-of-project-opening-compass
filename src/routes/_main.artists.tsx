import { createFileRoute } from "@tanstack/react-router";
import Artists from "@/pages/Artists";

export const Route = createFileRoute("/_main/artists")({
  head: () => ({ meta: [
    { title: 'Artists | LUO MUSIC STORE' },
    { name: 'description', content: 'Discover Luo and Acholi musicians and their latest songs.' },
    { property: 'og:title', content: 'Artists | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Discover Luo and Acholi musicians and their latest songs.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Artists,
});
