import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Music, ChevronUp, ChevronDown, Bookmark } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import { fetchReels, fetchArtists, toggleReelLike, addReelComment, type ReelDoc } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Artist } from '@/lib/types';
import ReelPlayer from '@/components/ReelPlayer';

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const ReelItem = ({ reel, isVisible, artists }: { reel: ReelDoc; isVisible: boolean; artists: Artist[] }) => {
  const { user, profile } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(reel.comments || []);
  const [likeCount, setLikeCount] = useState(reel.likes);

  useEffect(() => {
    if (user) setLiked(reel.likedBy?.includes(user.uid) || false);
  }, [user, reel.likedBy]);

  const artist = artists.find(a => a.id === reel.artistId);
  const artistPhoto = artist ? getProxiedUrl((artist as any).photoURL) : '';

  const handleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    await toggleReelLike(reel.id, user.uid, liked);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    const comment = { user: profile?.name || 'Anonymous', userId: user.uid, text: commentText, time: 'Just now', likes: 0, likedBy: [] };
    setLocalComments(prev => [...prev, comment]);
    setCommentText('');
    await addReelComment(reel.id, comment);
  };

  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start snap-always">
      {/* Video player */}
      <ReelPlayer
        videoURL={reel.videoURL}
        isVisible={isVisible}
        gradientFrom={reel.gradientFrom}
        gradientTo={reel.gradientTo}
      />

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        <Link to={`/artist/${reel.artistId}`}>
          {artistPhoto ? (
            <img src={artistPhoto} alt={reel.artistName} className="w-10 h-10 rounded-full border-2 border-background object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-background"
              style={{ background: artist ? `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` : 'hsl(var(--secondary))' }} />
          )}
        </Link>
        <button onClick={handleLike} className="flex flex-col items-center gap-0.5">
          <Heart className={`w-6 h-6 ${liked ? 'fill-primary text-primary' : 'text-background'}`} />
          <span className="text-[10px] text-background font-medium">{formatCount(likeCount)}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-6 h-6 text-background" />
          <span className="text-[10px] text-background font-medium">{localComments.length}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Share2 className="w-6 h-6 text-background" />
          <span className="text-[10px] text-background font-medium">{formatCount(reel.shares)}</span>
        </button>
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-0.5">
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-background text-background' : 'text-background'}`} />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-3 right-16 z-20">
        <Link to={`/artist/${reel.artistId}`} className="font-bold text-background text-sm">@{reel.artistName.replace(/\s/g, '')}</Link>
        <p className="text-background/90 text-xs mt-1 line-clamp-2">{reel.caption}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <Music className="w-3 h-3 text-background/80" />
          <span className="text-[10px] text-background/80">♫ {reel.audioTitle}</span>
        </div>
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="absolute bottom-0 left-0 right-0 h-[60%] bg-background rounded-t-2xl z-30 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-sm font-heading">{localComments.length} Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-muted-foreground text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {localComments.map((c, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0" />
                  <div>
                    <p className="text-xs"><span className="font-semibold">{c.user}</span> <span className="text-muted-foreground">{c.time}</span></p>
                    <p className="text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {user && (
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()} placeholder="Add a comment..." maxLength={280} className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm outline-none" />
                <button onClick={handleComment} className="text-primary text-sm font-semibold">Post</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Reels = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reels, setReels] = useState<ReelDoc[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [r, a] = await Promise.all([fetchReels(), fetchArtists()]);
      setReels(r);
      setArtists(a);
      setLoading(false);
    };
    load();
  }, []);

  const goUp = () => setCurrentIndex(prev => Math.max(0, prev - 1));
  const goDown = () => setCurrentIndex(prev => Math.min(reels.length - 1, prev + 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') goUp();
      if (e.key === 'ArrowDown') goDown();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reels.length]);

  const scrollCooldown = useRef(false);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrollCooldown.current) return;
      scrollCooldown.current = true;
      if (e.deltaY > 0) goDown();
      else goUp();
      setTimeout(() => { scrollCooldown.current = false; }, 600);
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [reels.length]);

  // Touch swipe support
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goDown();
      else goUp();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (reels.length === 0) {
    return <div className="text-center py-20 text-muted-foreground">No reels yet.</div>;
  }

  return (
    <div className="pb-0 -mx-6 -mt-4">
      <div
        ref={containerRef}
        className="relative h-[calc(100vh-80px)] overflow-hidden rounded-xl mx-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <button onClick={goUp} disabled={currentIndex === 0} className="w-8 h-8 rounded-full bg-foreground/20 flex items-center justify-center text-background disabled:opacity-30 hover:bg-foreground/40 transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={goDown} disabled={currentIndex === reels.length - 1} className="w-8 h-8 rounded-full bg-foreground/20 flex items-center justify-center text-background disabled:opacity-30 hover:bg-foreground/40 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute top-4 left-4 z-30 bg-foreground/20 rounded-full px-3 py-1 text-xs text-background font-medium">
          {currentIndex + 1} / {reels.length}
        </div>

        <motion.div animate={{ y: -currentIndex * 100 + '%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="h-full" style={{ height: `${reels.length * 100}%` }}>
          {reels.map((reel, i) => (
            <div key={reel.id} style={{ height: `${100 / reels.length}%` }}>
              <ReelItem reel={reel} isVisible={i === currentIndex} artists={artists} />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Reels;
