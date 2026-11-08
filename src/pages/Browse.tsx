import { useState, useEffect } from 'react';
import TrackListItem from '@/components/TrackListItem';
import FilterTabs from '@/components/FilterTabs';
import { fetchTracks } from '@/lib/firebaseServices';
import type { TrackFilter } from '@/lib/firebaseServices';
import { genres } from '@/lib/constants';
import type { Track } from '@/lib/types';

const Browse = () => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeGenre, setActiveGenre] = useState('All');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-2xl font-bold font-heading mb-1">Browse Music</h1>
        <p className="text-sm text-muted-foreground">Discover new tracks across all genres</p>
      </div>

      <FilterTabs activeFilter={activeFilter} activeGenre={activeGenre} onFilterChange={setActiveFilter} onGenreChange={setActiveGenre} />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-4 mt-4">{tracks.length} tracks found</p>
          <div className="flex flex-col gap-0.5">
            {tracks.map((track, i) => (<TrackListItem key={track.id} track={track} index={i} />))}
          </div>
          {tracks.length === 0 && <div className="text-center py-16"><p className="text-muted-foreground">No tracks found for this filter.</p></div>}
        </>
      )}
    </div>
  );
};

export default Browse;
