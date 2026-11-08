import { forwardRef } from 'react';
import { Play } from 'lucide-react';
import { Link, useNavigate } from '@/lib/router-compat';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { MusicVideo } from '@/lib/types';

interface VideoCardProps {
  video: MusicVideo;
  compact?: boolean;
}

const VideoCard = forwardRef<HTMLDivElement, VideoCardProps>(({ video, compact = false }, ref) => {
  const navigate = useNavigate();

  const thumbnailSrc = getProxiedUrl(video.thumbnailURL);

  if (compact) {
    return (
      <div
        ref={ref}
        className="group flex gap-3 rounded-lg overflow-hidden glass-card hover:bg-surface-hover transition-all duration-300 cursor-pointer p-2"
        onClick={() => navigate(`/video/${video.id}`)}
      >
        <div className="relative w-40 aspect-video flex-shrink-0 rounded-lg overflow-hidden">
          {thumbnailSrc ? (
            <img src={thumbnailSrc} alt={video.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${video.gradientFrom}, ${video.gradientTo})` }}
            />
          )}
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-medium">
            {video.duration}
          </div>
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.artist}</p>
          
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="group rounded-lg overflow-hidden glass-card hover:bg-surface-hover transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className="relative aspect-video overflow-hidden">
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <div
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${video.gradientFrom}, ${video.gradientTo})` }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/30 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 glow-primary-sm">
            <Play className="w-6 h-6 ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-background/80 text-xs font-medium">
          {video.duration}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{video.title}</h3>
        <Link
          to={`/artist/${video.artistId}`}
          className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5"
          onClick={e => e.stopPropagation()}
        >
          {video.artist}
        </Link>
        
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;
