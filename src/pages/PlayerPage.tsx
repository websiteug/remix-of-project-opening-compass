import { siteOrigin } from '@/lib/siteUrl';
import { useParams, Link, useNavigate } from '@/lib/router-compat';
import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, Share2, UserPlus, MoreHorizontal, ListPlus } from 'lucide-react';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { Button } from '@/components/ui/button';
import TrackListItem from '@/components/TrackListItem';
import DownloadButton from '@/components/DownloadButton';
import GoogleDrivePlayer from '@/components/GoogleDrivePlayer';
import { isGoogleDriveUrl } from '@/lib/googleDrive';
import JsonLd from '@/components/JsonLd';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO, getMusicTrackJsonLd } from '@/hooks/useSEO';
import { fetchTrackById, fetchTracks, fetchArtistById, toggleFavourite, fetchUserFavourites, checkFollowing, toggleFollow } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';
import type { Track, Artist } from '@/lib/types';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const PlayerPageInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, play, toggle, progress, currentTime, duration, seek, next, prev, hasAudio, audioLoading } = usePlayer();
  const { user } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const t = await fetchTrackById(id);
      setTrack(t);
      if (t) {
        const [a, allTracks] = await Promise.all([
          fetchArtistById(t.artistId),
          fetchTracks(t.genre),
        ]);
        setArtist(a);
        const related = allTracks.filter(tr => tr.id !== id);
        setRelatedTracks(related);
        if (currentTrack?.id !== t.id) {
          play(t, [t, ...related]);
        }
        if (user) {
          const [favs, isFollow] = await Promise.all([
            fetchUserFavourites(user.uid),
            checkFollowing(user.uid, t.artistId),
          ]);
          setLiked(favs.includes(id));
          setFollowing(isFollow);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  // Dynamic SEO for this track
  useSEO({
    title: track ? `${track.title} by ${track.artist} - Free Download | LUO MUSIC STORE` : undefined,
    description: track ? `Listen to and download "${track.title}" by ${track.artist} for free. ${track.genre} music from LUO MUSIC STORE - Luo music, Acholi music, free downloads.` : undefined,
    image: track?.coverURL,
    url: track ? `${siteOrigin()}/play/${track.id}` : undefined,
    type: 'music.song',
    artist: track?.artist,
    duration: track?.duration,
    genre: track?.genre,
    keywords: track ? [track.title, track.artist, track.genre, 'mp3 download', 'free music'] : [],
  });

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    if (showMore) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Track not found</p>
        <Link to="/music"><Button variant="outline" className="rounded-full">Back to Music</Button></Link>
      </div>
    );
  }

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const handlePlayToggle = () => {
    if (isActive) toggle();
    else play(track, [track, ...relatedTracks]);
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to like tracks.', variant: 'destructive' });
      return;
    }
    setLiked(!liked);
    await toggleFavourite(user.uid, track.id, liked);
    toast({ title: liked ? 'Removed from favourites' : 'Added to favourites' });
  };

  const handleFollow = async () => {
    if (!user || !track) return;
    setFollowing(!following);
    await toggleFollow(user.uid, track.artistId, following);
  };

  const downloadFilename = (() => {
    const ext = getExtFromUrl(track.audioURL || '') || '.mp3';
    return `${track.title} - ${track.artist}${ext}`;
  })();

  const handleShare = async () => {
    const shareData = {
      title: track.title,
      text: `Listen to "${track.title}" by ${track.artist}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied!', description: 'Track link copied to clipboard.' });
      }
    } catch (err) {
      // User cancelled share or error
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied!', description: 'Track link copied to clipboard.' });
      }
    }
  };

  const displayProgress = isActive ? progress : 0;
  const displayTime = isActive ? currentTime : 0;
  const displayDuration = isActive ? duration : parseDuration(track.duration);

  // Generate JSON-LD structured data
  const trackJsonLd = track ? getMusicTrackJsonLd(track) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24 max-w-2xl mx-auto">
      {/* Structured Data for SEO */}
      {trackJsonLd && <JsonLd data={trackJsonLd} />}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
      </button>

      {/* Cover Art */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="relative mx-auto w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl">
        {getProxiedUrl(track.coverURL) ? (
          <img src={getProxiedUrl(track.coverURL)} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }} />
        )}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} className="w-1 bg-background/80 rounded-full" animate={{ height: [8, 20, 8] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Google Drive hosted audio uses Drive's own player */}
      {isGoogleDriveUrl(track.audioURL) && (
        <div className="mt-5 px-4">
          <GoogleDrivePlayer url={track.audioURL!} title={track.title} kind="audio" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            Played with Google Drive's player
          </p>
        </div>
      )}

      {/* Audio loading indicator */}
      {isActive && !isGoogleDriveUrl(track.audioURL) && audioLoading && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full inline-block">
            🎵 Loading audio...
          </p>
        </div>
      )}

      {/* Audio format warning - only show after loading is done */}
      {isActive && !isGoogleDriveUrl(track.audioURL) && !audioLoading && !hasAudio && track.audioURL && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full inline-block">
            ⚠️ Audio format not supported by browser. Upload MP3, WAV, or FLAC files.
          </p>
        </div>
      )}

      <div className="text-center mt-6">
        <h1 className="text-2xl font-bold font-heading">{track.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{track.genre} · {track.plays} plays</p>
      </div>

      <div className="flex items-center justify-between mt-6 px-4">
        <Link to={`/artist/${track.artistId}`} className="flex items-center gap-3">
          {(artist as any)?.photoURL ? (
            <img src={getProxiedUrl((artist as any).photoURL)} alt={track.artist} className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: artist ? `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` : 'hsl(var(--secondary))' }} />
          )}
          <div>
            <p className="font-semibold text-sm">{track.artist}</p>
            <p className="text-xs text-muted-foreground">{artist?.followers || '0'} followers</p>
          </div>
        </Link>
        <Button variant={following ? 'default' : 'outline'} size="sm" className="rounded-full gap-1.5 border-border" onClick={handleFollow}>
          <UserPlus className="w-3.5 h-3.5" />{following ? 'Following' : 'Follow'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 px-4">
        <div
          className="w-full h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            seek(pct);
          }}
        >
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${displayProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <button className="text-muted-foreground hover:text-foreground transition-colors"><Shuffle className="w-4 h-4" /></button>
        <button onClick={prev} className="text-muted-foreground hover:text-foreground transition-colors"><SkipBack className="w-5 h-5" /></button>
        <button onClick={handlePlayToggle} className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-primary hover:scale-105 transition-transform">
          {isCurrentlyPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        <button onClick={next} className="text-muted-foreground hover:text-foreground transition-colors"><SkipForward className="w-5 h-5" /></button>
        <button className="text-muted-foreground hover:text-foreground transition-colors"><Repeat className="w-4 h-4" /></button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-8 mt-6 relative">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-5 h-5 transition-colors ${liked ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
          <span className="text-[10px] text-muted-foreground">{liked ? 'Liked' : 'Like'}</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <DownloadButton
            url={track.audioURL || ''}
            filename={downloadFilename}
            variant="outline"
            size="sm"
            className="border-0 bg-transparent hover:bg-transparent p-0 h-auto"
          />
        </div>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          <span className="text-[10px] text-muted-foreground">Share</span>
        </button>
        <div className="relative" ref={moreRef}>
          <button onClick={() => setShowMore(!showMore)} className="flex flex-col items-center gap-1">
            <MoreHorizontal className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            <span className="text-[10px] text-muted-foreground">More</span>
          </button>
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px] z-50"
              >
                <button
                  onClick={() => { navigate(`/artist/${track.artistId}`); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Go to Artist
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: 'Copied!', description: 'Track link copied.' });
                    setShowMore(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Copy Link
                </button>
                {track.genre && (
                  <button
                    onClick={() => { navigate(`/music`); setShowMore(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <ListPlus className="w-4 h-4" /> Browse {track.genre}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Related */}
      {relatedTracks.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold font-heading mb-3">More in {track.genre}</h2>
          <div className="flex flex-col gap-1">
            {relatedTracks.map((t, i) => (
              <div key={t.id} onClick={() => navigate(`/play/${t.id}`)} className="cursor-pointer">
                <TrackListItem track={t} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

function parseDuration(dur: string): number {
  const parts = dur.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function getExtFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split('.').pop();
    if (ext && ext.length <= 5) return `.${ext}`;
  } catch {}
  return '';
}

const PlayerPage = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}><PlayerPageInner /></div>
));
PlayerPage.displayName = 'PlayerPage';

export default PlayerPage;
