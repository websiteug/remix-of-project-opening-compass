import { createFileRoute } from "@tanstack/react-router";
import AdminSelebTalkPage from "@/pages/admin/AdminSelebTalkPage";

export const Route = createFileRoute("/admin/guide")({
  head: () => ({ meta: [
    { title: 'Manage Music Guide | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage music guide updates on LUO MUSIC STORE.' },
    { property: 'og:title', content: 'Manage Music Guide | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage music guide updates on LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminSelebTalkPage,
});
