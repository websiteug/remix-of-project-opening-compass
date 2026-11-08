import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, X } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useNavigate } from '@/lib/router-compat';
import { getProxiedUrl } from '@/lib/mediaProxy';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const PlayerBar = () => {
  const { currentTrack, isPlaying, toggle, progress, currentTime, duration, seek, volume, setVolume, next, prev, stop } = usePlayer();
  const navigate = useNavigate();

  if (!currentTrack) return null;

  const coverSrc = getProxiedUrl(currentTrack.coverURL);
  const coverBg = !coverSrc
    ? `linear-gradient(135deg, ${currentTrack.gradientFrom}, ${currentTrack.gradientTo})`
    : undefined;

  return (
    <div className="glass-strong fixed bottom-[80px] md:bottom-3 left-2 right-2 md:left-[236px] md:right-3 z-50 rounded-3xl">
      <div className="flex items-center h-[72px] px-4 md:px-6 gap-4">
        <div
          className="flex items-center gap-3 min-w-0 w-1/4 cursor-pointer"
          onClick={() => navigate(`/play/${currentTrack.id}`)}
        >
          {coverSrc ? (
            <img src={coverSrc} alt={currentTrack.title} className="w-11 h-11 rounded-lg flex-shrink-0 object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-lg flex-shrink-0" style={{ background: coverBg }} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 max-w-xl mx-auto">
          <div className="flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"><Shuffle className="w-3.5 h-3.5" /></button>
            <button onClick={prev} className="text-muted-foreground hover:text-foreground transition-colors"><SkipBack className="w-4 h-4" /></button>
            <button onClick={toggle} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={next} className="text-muted-foreground hover:text-foreground transition-colors"><SkipForward className="w-4 h-4" /></button>
            <button className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"><Repeat className="w-3.5 h-3.5" /></button>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground w-full max-w-md">
            <span>{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1 bg-muted rounded-full overflow-hidden cursor-pointer group relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
              }}
            >
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-auto md:w-1/4 justify-end">
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setVolume(volume > 0 ? 0 : 0.75)}>
              {volume === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div
              className="w-20 h-1 bg-muted rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
              }}
            >
              <div className="h-full bg-primary rounded-full" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
          <button
            onClick={stop}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
