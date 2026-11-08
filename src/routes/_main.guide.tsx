import { createFileRoute } from "@tanstack/react-router";
import SelebTalk from "@/pages/SelebTalk";

export const Route = createFileRoute("/_main/guide")({
  head: () => ({ meta: [
    { title: 'Music Guide | LUO MUSIC STORE' },
    { name: 'description', content: 'Explore music updates and the LUO MUSIC STORE guide.' },
    { property: 'og:title', content: 'Music Guide | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Explore music updates and the LUO MUSIC STORE guide.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SelebTalk,
});
