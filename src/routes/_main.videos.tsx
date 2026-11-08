import { createFileRoute } from "@tanstack/react-router";
import Videos from "@/pages/Videos";

export const Route = createFileRoute("/_main/videos")({
  head: () => ({ meta: [
    { title: 'Music Videos | LUO MUSIC STORE' },
    { name: 'description', content: 'Watch the latest Luo, Acholi and Ugandan music videos.' },
    { property: 'og:title', content: 'Music Videos | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Watch the latest Luo, Acholi and Ugandan music videos.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Videos,
});
