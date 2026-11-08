import { createFileRoute } from "@tanstack/react-router";
import AdminHeroSlides from "@/pages/admin/AdminHeroSlides";

export const Route = createFileRoute("/admin/hero-slides")({
  head: () => ({ meta: [
    { title: 'Manage Featured Slides | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage featured music promotions on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Featured Slides | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage featured music promotions on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminHeroSlides,
});
