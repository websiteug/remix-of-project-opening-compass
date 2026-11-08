import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import TrackListItem from '@/components/TrackListItem';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserFavourites, fetchTrackById } from '@/lib/firebaseServices';
import type { Track } from '@/lib/types';

const Favourites = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const favIds = await fetchUserFavourites(user.uid);
      const trackDocs = await Promise.all(favIds.map(id => fetchTrackById(id)));
      setTracks(trackDocs.filter(Boolean) as Track[]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Favourite Songs</h1>
            <p className="text-muted-foreground text-sm">Sign in to see your favourites</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Favourite Songs</h1>
          <p className="text-muted-foreground text-sm">{tracks.length} songs</p>
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="flex flex-col gap-1">
          {tracks.map((track, i) => (
            <TrackListItem key={track.id} track={track} index={i} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-8 text-center">No favourites yet. Like tracks to add them here!</p>
      )}
    </div>
  );
};

export default Favourites;
