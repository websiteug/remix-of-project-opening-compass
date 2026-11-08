import { useEffect } from 'react';
import { getDriveEmbedUrl } from '@/lib/googleDrive';
import { usePlayer } from '@/contexts/PlayerContext';

interface GoogleDrivePlayerProps {
  url: string;
  title?: string;
  /** 'video' keeps a 16:9 frame, 'audio' uses a short bar-like frame. */
  kind?: 'video' | 'audio';
  className?: string;
}

/**
 * Google Drive refuses playback through our own player, so we embed Drive's
 * native preview player for Drive-hosted audio and video.
 */
const GoogleDrivePlayer = ({ url, title, kind = 'video', className }: GoogleDrivePlayerProps) => {
  const embedUrl = getDriveEmbedUrl(url);
  const { stopForVideo } = usePlayer();

  // Drive's player can't tell us when it starts, so opening a Drive video stops the song.
  useEffect(() => {
    if (kind === 'video' && embedUrl) stopForVideo();
  }, [kind, embedUrl, stopForVideo]);

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center bg-secondary rounded-2xl p-6 ${className || ''}`}>
        <p className="text-xs text-muted-foreground">Invalid Google Drive link</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-black ${className || ''}`}>
      <iframe
        src={embedUrl}
        title={title || 'Google Drive player'}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        className="w-full border-0"
        style={{ aspectRatio: kind === 'audio' ? '16 / 5' : '16 / 9', display: 'block' }}
      />
    </div>
  );
};

export default GoogleDrivePlayer;
