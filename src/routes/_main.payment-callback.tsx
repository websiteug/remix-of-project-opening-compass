import { createFileRoute } from "@tanstack/react-router";
import PaymentCallback from "@/pages/PaymentCallback";

export const Route = createFileRoute("/_main/payment-callback")({
  head: () => ({ meta: [
    { title: 'Payment Status | LUO MUSIC STORE' },
    { name: 'description', content: 'Check your LUO MUSIC STORE payment status.' },
    { property: 'og:title', content: 'Payment Status | LUO MUSIC STORE' },
    { property: 'og:description', content: 'Check your LUO MUSIC STORE payment status.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: PaymentCallback,
});
