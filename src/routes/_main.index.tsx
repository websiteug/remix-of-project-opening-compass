import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/_main/")({
  head: () => ({ meta: [
    { title: 'LUO MUSIC STORE — Songs & Music Videos' },
    { name: 'description', content: 'Discover the latest Luo songs, most played tracks and music videos on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'LUO MUSIC STORE — Songs & Music Videos' },
    { property: 'og:description', content: 'Discover the latest Luo songs, most played tracks and music videos on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});
