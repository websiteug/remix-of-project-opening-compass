import { useState } from 'react';
import { Play, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/contexts/PlayerContext';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
  poster?: string;
  className?: string;
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
  } catch {}
  return null;
}

const YouTubePlayer = ({ videoUrl, title, poster, className }: YouTubePlayerProps) => {
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoId = getYoutubeVideoId(videoUrl);
  const { stopForVideo } = usePlayer();

  if (!videoId) {
    return (
      <div className={`relative aspect-video bg-muted flex items-center justify-center rounded-xl ${className || ''}`}>
        <p className="text-sm text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  const thumbnailUrl = poster || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=0&vq=hd1080&enablejsapi=1`;

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Close/minimize button - top left to avoid blocking controls */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/50 hover:bg-black/70 rounded-full"
            onClick={() => setExpanded(false)}
          >
            <Minimize2 className="w-5 h-5" />
          </Button>
        </div>
        {/* Full screen iframe */}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title={title || 'YouTube Video'}
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
        {/* Blocking overlay - only top bar to block YouTube logo/title */}
        <div className="absolute top-0 left-12 right-0 h-14 z-10 bg-transparent cursor-default" />
      </div>
    );
  }

  return (
    <div className={`relative aspect-video bg-black rounded-xl overflow-hidden ${className || ''}`}>
      {playing ? (
        <>
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={title || 'YouTube Video'}
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
          {/* Blocking overlays - top bar, right watermark, and bottom-right fullscreen button */}
          <div className="absolute top-0 left-0 right-16 h-14 z-10 bg-transparent cursor-default" />
          <div className="absolute top-14 right-0 bottom-0 w-14 z-10 bg-transparent cursor-default" />
          {/* Expand/Zoom button - bottom right, replacing YouTube's fullscreen */}
          <div className="absolute bottom-2 right-2 z-20">
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <button
          onClick={() => { stopForVideo(); setPlaying(true); }}
          className="w-full h-full relative group cursor-pointer"
        >
          <img
            src={thumbnailUrl}
            alt={title || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-7 h-7 text-primary-foreground ml-1" />
            </div>
          </div>
          {title && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm font-medium line-clamp-1">{title}</p>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default YouTubePlayer;
