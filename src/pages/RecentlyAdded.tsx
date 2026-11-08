import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import TrackListItem from '@/components/TrackListItem';
import VideoCard from '@/components/VideoCard';
import { fetchTracks, fetchVideos } from '@/lib/firebaseServices';
import type { Track, MusicVideo } from '@/lib/types';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const RecentlyAdded = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [t, v] = await Promise.all([fetchTracks(), fetchVideos()]);
      const byNew = (a: any, b: any) => (b.addedDate || '').localeCompare(a.addedDate || '');
      setTracks([...t].sort(byNew));
      setVideos([...v].sort(byNew));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading mb-1">Recently Added</h1>
        <p className="text-muted-foreground text-sm">Latest music and videos added to the platform</p>
      </div>

      {tracks.length === 0 && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-card rounded-xl">
          <Clock className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No recently added content yet</p>
        </div>
      )}

      {tracks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold font-heading mb-3">New Songs</h2>
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-1">
            {tracks.map((track, i) => (
              <motion.div key={track.id} variants={item}>
                <TrackListItem track={track} index={i} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold font-heading mb-3">New Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default RecentlyAdded;
