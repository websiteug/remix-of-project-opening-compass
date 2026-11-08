import { forwardRef } from 'react';
import { Play, Pause, Heart, Plus } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { usePlayer } from '@/contexts/PlayerContext';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track } from '@/lib/types';

interface TrackListItemProps {
  track: Track;
  index: number;
}

const TrackListItem = forwardRef<HTMLButtonElement, TrackListItemProps>(({ track, index }, ref) => {
  const { currentTrack, isPlaying, play, toggle } = usePlayer();
  const navigate = useNavigate();
  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const handleClick = () => {
    navigate(`/play/${track.id}`);
  };

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) toggle();
    else play(track);
  };

  const coverSrc = getProxiedUrl(track.coverURL);

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-hover'
      }`}
    >
      <div className="w-6 text-center flex-shrink-0" onClick={handlePlayToggle}>
        {isActive ? (
          isCurrentlyPlaying ? <Pause className="w-3.5 h-3.5 mx-auto" /> : <Play className="w-3.5 h-3.5 mx-auto ml-0.5" />
        ) : (
          <span className={`text-xs font-medium ${isActive ? '' : 'text-muted-foreground group-hover:hidden'}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        {!isActive && <Play className="w-3.5 h-3.5 mx-auto hidden group-hover:block text-foreground" />}
      </div>

      {coverSrc ? (
        <img src={coverSrc} alt={track.title} className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }} />
      )}

      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? '' : 'text-foreground'}`}>{track.title}</p>
        <p className={`text-xs truncate ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>{track.artist}</p>
      </div>

      <span className={`text-xs flex-shrink-0 ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>{track.duration}</span>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : 'text-muted-foreground opacity-0 group-hover:opacity-100'} transition-opacity`} />
        <Plus className={`w-3.5 h-3.5 ${isActive ? '' : 'text-muted-foreground opacity-0 group-hover:opacity-100'} transition-opacity`} />
      </div>
    </button>
  );
});

TrackListItem.displayName = 'TrackListItem';

export default TrackListItem;
