import { createFileRoute } from "@tanstack/react-router";
import ProfileSettings from "@/pages/ProfileSettings";

export const Route = createFileRoute("/_main/profile")({
  head: () => ({ meta: [
    { title: 'Your Profile | LUO MUSIC STORE' },
    { name: 'description', content: 'Manage your LUO MUSIC STORE profile and account.' },
    { property: 'og:title', content: 'Your Profile | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Manage your LUO MUSIC STORE profile and account.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ProfileSettings,
});
