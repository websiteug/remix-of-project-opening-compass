import { forwardRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { usePlayer } from '@/contexts/PlayerContext';

interface MuxVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
}

const MuxVideoPlayer = forwardRef<HTMLDivElement, MuxVideoPlayerProps>(
  ({ src, poster, title, className }, ref) => {
    const { stopForVideo } = usePlayer();
    return (
      <div ref={ref} className={`mux-apple-player ${className || ''}`}>
        <MuxPlayer
          src={src}
          poster={poster || undefined}
          title={title}
          streamType="on-demand"
          preload="auto"
          crossOrigin="anonymous"
          preferPlayback="mse"
          maxResolution="1080p"
          minResolution="480p"
          renditionOrder="desc"
          startTime={0}
          onPlay={stopForVideo}
          style={{
            aspectRatio: '16/9',
            width: '100%',
            '--media-object-fit': 'contain',
          } as any}
        />
      </div>
    );
  }
);

MuxVideoPlayer.displayName = 'MuxVideoPlayer';
export default MuxVideoPlayer;
