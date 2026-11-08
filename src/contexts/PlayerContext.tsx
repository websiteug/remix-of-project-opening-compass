import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { recordTrackPlay } from '@/lib/playHistory';
import type { Track } from '@/lib/types';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { isGoogleDriveUrl } from '@/lib/googleDrive';
import { toast } from 'sonner';

/**
 * Pause every video on the page (native <video>, Mux players and YouTube
 * embeds) so a song never plays on top of a video. Returns true when
 * something audible was paused.
 */
function pauseAllVideos(): boolean {
  if (typeof document === 'undefined') return false;
  let paused = false;
  document.querySelectorAll<HTMLMediaElement>('video, mux-player').forEach(el => {
    if (!el.paused && !el.muted) paused = true;
    if (!el.paused) el.pause();
  });
  document.querySelectorAll<HTMLIFrameElement>('iframe[src*="youtube.com/embed"]').forEach(frame => {
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    paused = true;
  });
  return paused;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  volume: number;
  queue: Track[];
  hasAudio: boolean;
  audioLoading: boolean;
  play: (track: Track, trackList?: Track[]) => void;
  pause: () => void;
  toggle: () => void;
  seek: (percent: number) => void;
  setVolume: (vol: number) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  /** Stop the song because a video is starting; tells the listener. */
  stopForVideo: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [queue, setQueue] = useState<Track[]>([]);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIdRef = useRef<string>('');

  const playTrack = useCallback((track: Track, trackList?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    recordTrackPlay(track);
    if (trackList) setQueue(trackList);

    if (pauseAllVideos()) {
      toast.info('Video paused so your song can play');
    }

    audio.pause();
    audio.currentTime = 0;

    setCurrentTrack(track);
    trackIdRef.current = track.id;
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setHasAudio(false);

    if (isGoogleDriveUrl(track.audioURL)) {
      // Google Drive blocks playback through our own audio element; the
      // PlayerPage renders Drive's own embedded player instead.
      audio.src = '';
      setHasAudio(false);
      setAudioLoading(false);
      setIsPlaying(false);
      setDuration(parseDuration(track.duration));
    } else if (track.audioURL && track.audioURL.trim() !== '') {
      setAudioLoading(true);
      const proxiedAudioUrl = getProxiedUrl(track.audioURL);
      audio.src = proxiedAudioUrl;
      audio.load();
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play failed:', err);
        setHasAudio(false);
        setAudioLoading(false);
        setIsPlaying(false);
        setDuration(parseDuration(track.duration));
      });
    } else {
      audio.src = '';
      setHasAudio(false);
      setAudioLoading(false);
      setIsPlaying(true);
      setDuration(parseDuration(track.duration));
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.75;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onCanPlay = () => {
      setHasAudio(true);
      setAudioLoading(false);
    };

    const onError = () => {
      console.warn('Audio playback error - file may not be accessible or format unsupported');
      setHasAudio(false);
      setAudioLoading(false);
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      const currentId = trackIdRef.current;
      setQueue(prev => {
        const idx = prev.findIndex(t => t.id === currentId);
        if (idx >= 0 && idx < prev.length - 1) {
          const nextTrack = prev[idx + 1];
          setTimeout(() => playTrack(nextTrack, prev), 100);
        }
        return prev;
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('canplaythrough', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, [playTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.src) {
        if (!hasAudio) setAudioLoading(true);
        audio.play().catch(() => {
          setAudioLoading(false);
        });
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTrack, hasAudio]);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetDuration = (audio.duration && !isNaN(audio.duration)) ? audio.duration : duration;
    const seekTime = (percent / 100) * targetDuration;
    if (hasAudio && audio.src && audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
    setProgress(percent);
  }, [duration, hasAudio]);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setVolumeState(vol);
  }, []);

  const next = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx >= 0 && idx < queue.length - 1) {
      playTrack(queue[idx + 1], queue);
    }
  }, [currentTrack, queue, playTrack]);

  const prev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      playTrack(queue[idx - 1], queue);
    } else {
      seek(0);
    }
  }, [currentTrack, queue, playTrack, seek]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setHasAudio(false);
    setAudioLoading(false);
    setQueue([]);
    trackIdRef.current = '';
  }, []);

  // Refs so page-wide listeners always see the latest playback state.
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = Boolean(currentTrack) && (isPlaying || audioLoading);
  }, [currentTrack, isPlaying, audioLoading]);

  const stopForVideo = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    stop();
    toast.info('Music stopped so your video can play');
  }, [stop]);

  // Our song player lives outside the page, so any audible media that starts
  // inside the page is a video (or reel) — stop the song when that happens.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onMedia = (e: Event) => {
      const el = e.target as HTMLMediaElement | null;
      if (!el || el === audioRef.current) return;
      if (typeof el.paused !== 'boolean' || el.paused || el.muted) return;
      stopForVideo();
    };
    document.addEventListener('play', onMedia, true);
    document.addEventListener('playing', onMedia, true);
    document.addEventListener('volumechange', onMedia, true);
    return () => {
      document.removeEventListener('play', onMedia, true);
      document.removeEventListener('playing', onMedia, true);
      document.removeEventListener('volumechange', onMedia, true);
    };
  }, [stopForVideo]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      duration,
      currentTime,
      volume,
      queue,
      hasAudio,
      audioLoading,
      play: playTrack,
      pause,
      toggle,
      seek,
      setVolume,
      next,
      prev,
      stop,
      stopForVideo,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

function parseDuration(dur: string): number {
  const parts = dur.split(':');
  return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};