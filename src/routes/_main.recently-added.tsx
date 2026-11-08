import { createFileRoute } from "@tanstack/react-router";
import RecentlyAdded from "@/pages/RecentlyAdded";

export const Route = createFileRoute("/_main/recently-added")({
  head: () => ({ meta: [
    { title: 'Recently Added Music | LUO MUSIC STORE' },
    { name: 'description', content: 'Discover newly uploaded songs and videos.' },
    { property: 'og:title', content: 'Recently Added Music | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Discover newly uploaded songs and videos.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: RecentlyAdded,
});
