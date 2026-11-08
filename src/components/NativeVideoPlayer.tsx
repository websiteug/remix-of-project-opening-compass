import { useRef, useState, useEffect } from 'react';

interface NativeVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
}

const NativeVideoPlayer = ({ src, poster, title, className }: NativeVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const vid = videoRef.current;
    if (!vid) return;
    
    const handleCanPlay = () => setIsReady(true);
    vid.addEventListener('canplay', handleCanPlay);
    
    // Force load immediately
    vid.load();
    
    return () => {
      vid.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

  return (
    <div className={`relative bg-black ${className || ''}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        title={title}
        controls
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="w-full aspect-video object-contain"
        style={{ display: 'block' }}
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default NativeVideoPlayer;
