import { useEffect, useRef, useState } from 'react';
import { getProxiedUrl } from '@/lib/mediaProxy';

interface ReelPlayerProps {
  videoURL?: string;
  isVisible: boolean;
  gradientFrom: string;
  gradientTo: string;
  onTap?: () => void;
}

const ReelPlayer = ({ videoURL, isVisible, gradientFrom, gradientTo, onTap }: ReelPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const proxiedUrl = videoURL ? getProxiedUrl(videoURL) : '';

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isVisible && proxiedUrl) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
      setPlaying(true);
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, [isVisible, proxiedUrl]);

  const handleTap = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
      setPlaying(false);
    } else {
      vid.play().catch(() => {});
      setPlaying(true);
    }
    onTap?.();
  };

  const handleUnmute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(prev => !prev);
  };

  if (!proxiedUrl) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        onClick={handleTap}
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-black" onClick={handleTap}>
      <video
        ref={videoRef}
        src={proxiedUrl}
        className="w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
      {/* Mute/unmute button */}
      <button
        onClick={handleUnmute}
        className="absolute top-4 right-14 z-30 w-8 h-8 rounded-full bg-foreground/20 flex items-center justify-center text-background hover:bg-foreground/40 transition-colors"
      >
        {muted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        )}
      </button>
      {/* Paused overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-foreground/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-background ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelPlayer;
