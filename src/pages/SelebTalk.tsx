import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Clock } from 'lucide-react';
import { fetchAllSelebTalks, type AdminSelebTalk } from '@/lib/adminService';
import { getProxiedUrl } from '@/lib/mediaProxy';
import NativeVideoPlayer from '@/components/NativeVideoPlayer';
import YouTubePlayer from '@/components/YouTubePlayer';

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {}
  return null;
}

const Guide = () => {
  const [guides, setGuides] = useState<AdminSelebTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<AdminSelebTalk | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchAllSelebTalks();
      setGuides(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">GUIDE</h1>
          <p className="text-muted-foreground text-sm">Video guides and tutorials</p>
        </div>
      </div>

      {/* Active Video Player */}
      {activeVideo && activeVideo.videoUrl && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 max-w-3xl"
        >
          <div className="rounded-xl overflow-hidden bg-black">
            {(() => {
              const isYoutube = activeVideo.videoUrl ? getYoutubeEmbedUrl(activeVideo.videoUrl) : null;
              if (isYoutube) {
                return (
                  <YouTubePlayer
                    videoUrl={activeVideo.videoUrl!}
                    title={activeVideo.title}
                    poster={activeVideo.thumbnailUrl ? getProxiedUrl(activeVideo.thumbnailUrl) : undefined}
                  />
                );
              }
              return (
                <NativeVideoPlayer
                  src={getProxiedUrl(activeVideo.videoUrl!)}
                  poster={activeVideo.thumbnailUrl ? getProxiedUrl(activeVideo.thumbnailUrl) : undefined}
                />
              );
            })()}
          </div>
          <div className="mt-3">
            <h2 className="text-lg font-bold">{activeVideo.title}</h2>
            {activeVideo.description && (
              <p className="text-sm text-muted-foreground mt-1">{activeVideo.description}</p>
            )}
            {activeVideo.artistName && (
              <p className="text-xs text-muted-foreground mt-1">By {activeVideo.artistName}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {guides.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl max-w-2xl">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No guides available yet.</p>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {guides.map((guide, idx) => (
          <motion.button
            key={guide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setActiveVideo(guide)}
            className={`group text-left bg-card rounded-xl overflow-hidden border transition-all hover:border-primary/40 ${
              activeVideo?.id === guide.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
            }`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted">
              {guide.thumbnailUrl ? (
                <img
                  src={getProxiedUrl(guide.thumbnailUrl)}
                  alt={guide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                </div>
              </div>
              {/* Duration badge */}
              {guide.duration && (
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {guide.duration}
                </span>
              )}
            </div>
            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-semibold line-clamp-2">{guide.title}</h3>
              {guide.artistName && (
                <p className="text-xs text-muted-foreground mt-1">{guide.artistName}</p>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Guide;
