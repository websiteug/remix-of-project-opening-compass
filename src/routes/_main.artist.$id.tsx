import { createFileRoute } from "@tanstack/react-router";
import ArtistProfile from "@/pages/ArtistProfile";
import { restGetDoc } from "@/lib/firestoreRest";

const SITE = "LUO MUSIC STORE";

export const Route = createFileRoute("/_main/artist/$id")({
  loader: async ({ params }) => {
    const artist = await restGetDoc<{ name?: string; genre?: string; bio?: string }>(
      "artists",
      params.id,
    );
    return { artist };
  },
  head: ({ params, loaderData }) => {
    const artist = loaderData?.artist;
    const name = artist?.name ?? "Artist";
    const genre = artist?.genre ?? "Luo Music";
    const pageTitle = `${name} — Songs, Videos & Free MP3 Downloads | ${SITE}`;
    const description =
      artist?.bio ||
      `All ${name} songs, music videos and free MP3 downloads. Stream ${name}'s latest ${genre} releases on ${SITE}.`;
    const url = `/artist/${params.id}`;

    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: description },
        {
          name: "keywords",
          content: `${name}, ${name} songs, ${name} music, ${name} mp3 download, ${name} videos, ${genre}, luo music, acholi music`,
        },
        { property: "og:type", content: "profile" },
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
            "@type": "MusicGroup",
            name,
            url,
            genre,
            description,
          }),
        },
      ],
    };
  },
  component: ArtistProfile,
});
