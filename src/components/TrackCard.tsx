import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { usePlayer } from '@/contexts/PlayerContext';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track } from '@/lib/types';

interface TrackCardProps {
  track: Track;
}

const TrackCard = forwardRef<HTMLDivElement, TrackCardProps>(({ track }, ref) => {
  const { currentTrack, isPlaying, play, toggle } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) toggle();
    else play(track);
  };

  const coverSrc = getProxiedUrl(track.coverURL);

  return (
    <div ref={ref} className="group flex-shrink-0">
      <div className="relative overflow-hidden rounded-md w-28 h-28 border border-border poster-shadow">
        {coverSrc ? (
          <img src={coverSrc} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <div
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }}
          />
        )}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all flex items-center justify-center">
          <Button size="icon" aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            onClick={handlePlay}
            className={`w-8 h-8 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg transition-all ${
              isCurrentlyPlaying
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            {isCurrentlyPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </Button>
        </div>
      </div>
      <div className="mt-1.5 max-w-[112px]">
        <h3 className="font-semibold text-xs truncate">{track.title}</h3>
        <Link
          to={`/artist/${track.artistId}`}
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors truncate block"
        >
          {track.artist}
        </Link>
      </div>
    </div>
  );
});

TrackCard.displayName = 'TrackCard';

export default TrackCard;
