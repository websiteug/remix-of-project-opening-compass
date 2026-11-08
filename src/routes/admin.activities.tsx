import { createFileRoute } from '@tanstack/react-router';
import AdminActivities from '@/pages/admin/AdminActivities';

export const Route = createFileRoute('/admin/activities')({
  head: () => ({ meta: [
    { title: 'User Activities | LUO MUSIC STORE Admin' },
    { name: 'description', content: 'Review visitor click activities in LUO MUSIC STORE.' },
    { property: 'og:title', content: 'User Activities | LUO MUSIC STORE Admin' },
    { property: 'og:description', content: 'Review visitor click activities in LUO MUSIC STORE.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: AdminActivities,
});