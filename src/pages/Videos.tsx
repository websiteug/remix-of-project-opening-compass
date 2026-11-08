import { siteOrigin } from '@/lib/siteUrl';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoCard from '@/components/VideoCard';
import FilterTabs from '@/components/FilterTabs';
import { useSEO } from '@/hooks/useSEO';
import { fetchVideos } from '@/lib/firebaseServices';
import type { MusicVideo } from '@/lib/types';
import { useSearchParams } from '@/lib/router-compat';
import { filterVideoGenre, videoGenre } from '@/lib/videoGenres';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const Videos = () => {
  // SEO for Videos page
  useSEO({
    title: 'Free Luo Music Videos | Watch & Download | LUO MUSIC STORE',
    description: 'Watch and download free Luo music videos and Acholi music videos. Latest visuals from independent East African artists. Free video downloads, Luo music videos.',
    url: `${siteOrigin()}/videos`,
    type: 'website',
    keywords: ['luo music videos', 'acholi music videos', 'free video download', 'african music videos', 'luo videos'],
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGenre = videoGenre(searchParams.get('genre') ?? 'All');
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const data = await fetchVideos();
      if (cancelled) return;
      setVideos(data);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleVideos = filterVideoGenre(videos, activeGenre);
  const setActiveGenre = (genre: string) => {
    const next = new URLSearchParams(searchParams);
    if (genre === 'All') next.delete('genre');
    else next.set('genre', genre);
    setSearchParams(next);
  };

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading mb-1">Music Videos</h1>
        <p className="text-muted-foreground text-sm">Watch the latest visuals from your favorite artists</p>
      </div>

      <FilterTabs activeFilter={activeFilter} activeGenre={activeGenre} onFilterChange={setActiveFilter} onGenreChange={setActiveGenre} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4" key={activeGenre}>
          {visibleVideos.map(video => (
            <motion.div key={video.id} variants={item}>
              <VideoCard video={video} />
            </motion.div>
          ))}
          {visibleVideos.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center col-span-full">No videos found in this genre.</p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Videos;
