import { createFileRoute } from "@tanstack/react-router";
import PlayerPage from "@/pages/PlayerPage";
import { restGetDoc } from "@/lib/firestoreRest";

const SITE = "LUO MUSIC STORE";

export const Route = createFileRoute("/_main/play/$id")({
  loader: async ({ params }) => {
    const track = await restGetDoc<{
      title?: string;
      artist?: string;
      artistId?: string;
      genre?: string;
      duration?: string;
      description?: string;
    }>("tracks", params.id);
    return { track };
  },
  head: ({ params, loaderData }) => {
    const track = loaderData?.track;
    const title = track?.title ?? "Song";
    const artist = track?.artist ?? "Luo artist";
    const genre = track?.genre ?? "Luo Music";
    const pageTitle = `${title} — ${artist} | Free MP3 Download & Stream | ${SITE}`;
    const description =
      track?.description ||
      `Listen to ${title} by ${artist} and download the MP3 free on ${SITE}. ${genre} song, Luo and Acholi music, high quality audio.`;
    const url = `/play/${params.id}`;

    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: description },
        {
          name: "keywords",
          content: `${title}, ${artist}, ${artist} songs, ${title} download, ${title} mp3, ${genre}, luo music, acholi music, free download`,
        },
        { property: "og:type", content: "music.song" },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: pageTitle },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicRecording",
            name: title,
            url,
            genre,
            inLanguage: "luo",
            byArtist: {
              "@type": "MusicGroup",
              name: artist,
              ...(track?.artistId ? { url: `/artist/${track.artistId}` } : {}),
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              description: "Free Download",
            },
          }),
        },
      ],
    };
  },
  component: PlayerPage,
});
