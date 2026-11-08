import { createFileRoute } from "@tanstack/react-router";
import AdminUsers from "@/pages/admin/AdminUsers";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [
    { title: 'Manage Users | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage LUO MUSIC STORE user accounts.' },
    { property: 'og:title', content: 'Manage Users | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage LUO MUSIC STORE user accounts.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminUsers,
});
