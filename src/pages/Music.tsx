import { siteOrigin } from '@/lib/siteUrl';
import { useState, useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import TrackListItem from '@/components/TrackListItem';
import FilterTabs from '@/components/FilterTabs';
import { useSEO } from '@/hooks/useSEO';
import { fetchTracks } from '@/lib/firebaseServices';
import type { TrackFilter } from '@/lib/firebaseServices';
import type { Track } from '@/lib/types';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const Music = () => {
  // SEO for Music page
  useSEO({
    title: 'Free Luo Music Downloads | Stream & Download Songs | LUO MUSIC STORE',
    description: 'Browse and download free Luo music and Acholi songs. Stream the latest tracks from independent East African artists. Free MP3 downloads, Luo music, Acholi music.',
    url: `${siteOrigin()}/music`,
    type: 'website',
    keywords: ['luo music', 'acholi songs', 'free mp3 download', 'east african music', 'luo songs download'],
  });
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeGenre, setActiveGenre] = useState(searchParams.get('genre') || 'All');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync genre from URL when it changes (e.g., clicking sidebar links)
  useEffect(() => {
    const genreFromUrl = searchParams.get('genre') || 'All';
    setActiveGenre(genreFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchTracks(activeGenre, activeFilter as TrackFilter);
      setTracks(data);
      setLoading(false);
    };
    load();
  }, [activeGenre, activeFilter]);

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading mb-1">Music</h1>
        <p className="text-muted-foreground text-sm">Browse and listen to all tracks</p>
      </div>

      <FilterTabs activeFilter={activeFilter} activeGenre={activeGenre} onFilterChange={setActiveFilter} onGenreChange={setActiveGenre} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-1 mt-4" key={`${activeGenre}-${activeFilter}`}>
          <p className="text-xs text-muted-foreground mb-2">{tracks.length} tracks found</p>
          {tracks.map((track, i) => (
            <motion.div key={track.id} variants={item}>
              <TrackListItem track={track} index={i} />
            </motion.div>
          ))}
          {tracks.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">No tracks found for this filter.</p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Music;
