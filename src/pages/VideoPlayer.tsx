import { siteOrigin } from '@/lib/siteUrl';
import { recordVideoPlay } from '@/lib/playHistory';
import { useParams, Link, useNavigate } from '@/lib/router-compat';
import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Share2, UserPlus, ThumbsUp, MessageCircle, MoreHorizontal, ListPlus } from 'lucide-react';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { Button } from '@/components/ui/button';
import VideoCard from '@/components/VideoCard';
import MuxVideoPlayer from '@/components/MuxVideoPlayer';
import GoogleDrivePlayer from '@/components/GoogleDrivePlayer';
import { isGoogleDriveUrl } from '@/lib/googleDrive';
import DownloadButton from '@/components/DownloadButton';
import JsonLd from '@/components/JsonLd';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO, getMusicVideoJsonLd } from '@/hooks/useSEO';
import { fetchVideoById, fetchVideos, fetchArtistById, checkFollowing, toggleFollow, toggleFavourite, fetchUserFavourites, incrementVideoViews } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';
import type { MusicVideo, Artist } from '@/lib/types';
import { videoGenreLink } from '@/lib/videoGenres';

const VideoPlayerInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState<MusicVideo | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<MusicVideo[]>([]);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [showMore, setShowMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setVideo(null);
    setArtist(null);
    setRelatedVideos([]);

    fetchVideoById(id).then(v => {
      setVideo(v);
      if (v) recordVideoPlay(v);
      setLoading(false);

      if (v) {
        // Increment views
        incrementVideoViews(id);
        
        fetchArtistById(v.artistId).then(setArtist);
        fetchVideos().then(allVids => setRelatedVideos(allVids.filter(vid => vid.id !== id)));
        if (user) {
          checkFollowing(user.uid, v.artistId).then(setFollowing);
          fetchUserFavourites(user.uid).then(favs => setLiked(favs.includes(id)));
        }
      }
    });
  }, [id, user]);

  // Dynamic SEO for this video
  useSEO({
    title: video ? `${video.title} by ${video.artist} - Free Download | LUO MUSIC STORE` : undefined,
    description: video ? `Watch and download "${video.title}" music video by ${video.artist} for free. ${video.genre || 'Luo'} music video from LUO MUSIC STORE - Luo music videos, Acholi music, free downloads.` : undefined,
    image: video?.thumbnailURL,
    url: video ? `${siteOrigin()}/video/${video.id}` : undefined,
    type: 'video.other',
    artist: video?.artist,
    duration: video?.duration,
    genre: video?.genre,
    keywords: video ? [video.title, video.artist, video.genre || '', 'music video', 'free download'] : [],
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

  const handleFollow = async () => {
    if (!user || !video) return;
    setFollowing(!following);
    await toggleFollow(user.uid, video.artistId, following);
  };

  const handleLike = async () => {
    if (!user || !id) {
      toast({ title: 'Sign in required', description: 'Please sign in to like videos.', variant: 'destructive' });
      return;
    }
    setLiked(!liked);
    await toggleFavourite(user.uid, id, liked);
    toast({ title: liked ? 'Removed from favourites' : 'Added to favourites' });
  };

  // Parse duration string (MM:SS or HH:MM:SS) to seconds
  const parseDurationToSeconds = (duration: string): number => {
    const parts = duration.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const downloadFilename = (() => {
    if (!video?.videoURL) return '';
    const ext = getExtFromUrl(video.videoURL) || '.mp4';
    return `${video.title} - ${video.artist}${ext}`;
  })();

  const handleShare = async () => {
    const shareData = {
      title: video?.title || '',
      text: `Watch "${video?.title}" by ${video?.artist}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied!', description: 'Video link copied to clipboard.' });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied!', description: 'Video link copied to clipboard.' });
      }
    }
  };

  const handleComment = () => {
    setShowCommentBox(!showCommentBox);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to comment.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Comment posted!', description: commentText.trim() });
    setCommentText('');
    setShowCommentBox(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Video not found</p>
        <Link to="/videos"><Button variant="outline" className="rounded-full">Back to Videos</Button></Link>
      </div>
    );
  }

  const hasVideoFile = !!video.videoURL;

  // Generate JSON-LD structured data
  const videoJsonLd = getMusicVideoJsonLd(video);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
      {/* Structured Data for SEO */}
      <JsonLd data={videoJsonLd} />

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
      </button>

      {/* Main content grid - Video on left, Related on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Video Player and Info */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          <div className="w-full rounded-2xl overflow-hidden bg-foreground/5">
            {hasVideoFile && isGoogleDriveUrl(video.videoURL) ? (
              <GoogleDrivePlayer
                key={video.id}
                url={video.videoURL!}
                title={video.title}
                kind="video"
              />
            ) : hasVideoFile ? (
              <MuxVideoPlayer
                key={video.id}
                src={getProxiedUrl(video.videoURL)!}
                poster={getProxiedUrl(video.thumbnailURL) || undefined}
                title={video.title}
                className="rounded-2xl overflow-hidden"
              />
            ) : (
              <div className="relative w-full aspect-video">
                {getProxiedUrl(video.thumbnailURL) ? (
                  <img src={getProxiedUrl(video.thumbnailURL)} alt={video.title} className="w-full h-full object-cover" loading="eager" decoding="async" />
                ) : (
                  <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${video.gradientFrom}, ${video.gradientTo})` }} />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                  <p className="text-background text-sm font-medium bg-foreground/60 px-4 py-2 rounded-full">No video file uploaded</p>
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-foreground/70 text-background text-xs font-medium">{video.duration}</div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h1 className="text-xl font-bold font-heading">{video.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{video.views} views</p>
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <Link to={`/artist/${video.artistId}`} className="flex items-center gap-3">
              {artist && getProxiedUrl((artist as any).photoURL) ? (
                <img src={getProxiedUrl((artist as any).photoURL)} alt={video.artist} className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" decoding="async" />
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: artist ? `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` : 'hsl(var(--secondary))' }} />
              )}
              <div>
                <p className="font-semibold text-sm">{video.artist}</p>
                <p className="text-xs text-muted-foreground">{artist?.followers || '0'} followers</p>
              </div>
            </Link>
            <Button variant={following ? 'default' : 'outline'} size="sm" className="rounded-full gap-1.5 border-border" onClick={handleFollow}>
              <UserPlus className="w-3.5 h-3.5" />{following ? 'Following' : 'Follow'}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 py-3 border-y border-border overflow-x-auto scrollbar-hide">
            <Button variant={liked ? 'default' : 'outline'} size="sm" className="rounded-full gap-1.5 border-border" onClick={handleLike}>
              <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />{liked ? 'Liked' : 'Like'}
            </Button>
            <DownloadButton
              url={video.videoURL || ''}
              filename={downloadFilename}
              videoId={video.id}
              durationSeconds={parseDurationToSeconds(video.duration)}
            />
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-border" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" />Share
            </Button>
            <Button variant={showCommentBox ? 'default' : 'outline'} size="sm" className="rounded-full gap-1.5 border-border" onClick={handleComment}>
              <MessageCircle className="w-3.5 h-3.5" />Comment
            </Button>
            <div className="relative" ref={moreRef}>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-border" onClick={() => setShowMore(!showMore)}>
                <MoreHorizontal className="w-3.5 h-3.5" />More
              </Button>
              <AnimatePresence>
                {showMore && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px] z-50"
                  >
                    <button
                      onClick={() => { navigate(`/artist/${video.artistId}`); setShowMore(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <UserPlus className="w-4 h-4" /> Go to Artist
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: 'Copied!', description: 'Video link copied.' });
                        setShowMore(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Copy Link
                    </button>
                    {video.genre && (
                      <Button variant="ghost"
                        onClick={() => { if (video.genre) navigate(videoGenreLink(video.genre)); setShowMore(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <ListPlus className="w-4 h-4" /> Browse {video.genre}
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Comment Box */}
          <AnimatePresence>
            {showCommentBox && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-secondary border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={e => e.key === 'Enter' && submitComment()}
                  />
                  <Button size="sm" className="rounded-full" onClick={submitComment} disabled={!commentText.trim()}>
                    Post
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column - Related Videos */}
        {relatedVideos.length > 0 && (
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold font-heading mb-3">Related Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {relatedVideos.map(v => (
                <div key={v.id} onClick={() => navigate(`/video/${v.id}`)} className="cursor-pointer">
                  <VideoCard video={v} compact />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function getExtFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split('.').pop();
    if (ext && ext.length <= 5) return `.${ext}`;
  } catch {}
  return '';
}

const VideoPlayer = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}><VideoPlayerInner /></div>
));
VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
