import { createFileRoute } from "@tanstack/react-router";
import Reels from "@/pages/Reels";

export const Route = createFileRoute("/_main/reels")({
  head: () => ({ meta: [
    { title: 'Music Reels | LUO MUSIC STORE' },
    { name: 'description', content: 'Watch short music videos from Luo and Ugandan artists.' },
    { property: 'og:title', content: 'Music Reels | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Watch short music videos from Luo and Ugandan artists.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Reels,
});
