import { createFileRoute } from "@tanstack/react-router";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [
    { title: 'Manage Subscriptions | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage LUO MUSIC STORE subscriptions.' },
    { property: 'og:title', content: 'Manage Subscriptions | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage LUO MUSIC STORE subscriptions.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminSubscriptions,
});
