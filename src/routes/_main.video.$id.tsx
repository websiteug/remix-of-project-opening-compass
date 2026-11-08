import { createFileRoute } from "@tanstack/react-router";
import VideoPlayer from "@/pages/VideoPlayer";
import { restGetDoc } from "@/lib/firestoreRest";

const SITE = "LUO MUSIC STORE";

export const Route = createFileRoute("/_main/video/$id")({
  loader: async ({ params }) => {
    const video = await restGetDoc<{
      title?: string;
      artist?: string;
      artistId?: string;
      genre?: string;
      description?: string;
    }>("videos", params.id);
    return { video };
  },
  head: ({ params, loaderData }) => {
    const video = loaderData?.video;
    const title = video?.title ?? "Music video";
    const artist = video?.artist ?? "Luo artist";
    const genre = video?.genre ?? "Luo Music";
    const pageTitle = `${title} — ${artist} | Official Music Video & Free Download | ${SITE}`;
    const description =
      video?.description ||
      `Watch the ${title} music video by ${artist} and download it free on ${SITE}. ${genre}, Luo and Acholi music videos.`;
    const url = `/video/${params.id}`;

    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: description },
        {
          name: "keywords",
          content: `${title}, ${artist}, ${artist} video, ${title} download, ${genre}, luo music video, acholi music video`,
        },
        { property: "og:type", content: "video.other" },
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
            "@type": "VideoObject",
            name: title,
            description,
            url,
            genre,
            inLanguage: "luo",
            creator: {
              "@type": "MusicGroup",
              name: artist,
              ...(video?.artistId ? { url: `/artist/${video.artistId}` } : {}),
            },
          }),
        },
      ],
    };
  },
  component: VideoPlayer,
});
