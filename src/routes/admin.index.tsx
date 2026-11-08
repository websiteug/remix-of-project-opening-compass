import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/admin/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: 'Administration | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage LUO MUSIC STORE content and accounts.' },
    { property: 'og:title', content: 'Administration | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage LUO MUSIC STORE content and accounts.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminDashboard,
});
