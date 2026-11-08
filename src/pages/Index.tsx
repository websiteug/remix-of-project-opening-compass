import { siteOrigin } from '@/lib/siteUrl';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import FeaturedHero from '@/components/FeaturedHero';
import TrackCard from '@/components/TrackCard';
import TrackListItem from '@/components/TrackListItem';
import JsonLd from '@/components/JsonLd';
import { useSEO, getWebsiteJsonLd } from '@/hooks/useSEO';
import { fetchTracks, fetchArtists, newestFirst } from '@/lib/firebaseServices';
import { genres } from '@/lib/constants';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track, Artist } from '@/lib/types';

const Index = () => {
  // Homepage SEO
  useSEO({
    title: 'LUO MUSIC STORE — Free Luo & Acholi Music Downloads | Stream & Download',
    description: 'Discover, stream, and download free Luo music and Acholi music from independent artists. Music videos, free downloads, promote your music. East African music platform.',
    url: siteOrigin(),
    type: 'website',
    keywords: ['luo music', 'acholi music', 'free download', 'music videos', 'african music', 'uganda music', 'kenya music'],
  });

  const websiteJsonLd = getWebsiteJsonLd();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const weeklyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const [t, a] = await Promise.all([fetchTracks(), fetchArtists()]);
      setTracks(t);
      setArtists(a);
      setLoading(false);
    };
    init();
  }, []);

  const scrollWeekly = (direction: 'left' | 'right') => {
    const el = weeklyScrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  // Weekly top = most played + downloaded this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekThreshold = oneWeekAgo.toISOString().split('T')[0];

  const weeklyTracks = [...tracks]
    .filter(t => (t.addedDate || '') >= weekThreshold)
    .sort((a, b) => {
      const scoreA = parseInt(a.plays || '0') + parseInt(a.downloads || '0');
      const scoreB = parseInt(b.plays || '0') + parseInt(b.downloads || '0');
      return scoreB - scoreA;
    })
    .slice(0, 8);

  // If not enough weekly tracks, fallback to top overall
  const displayWeekly = weeklyTracks.length >= 2
    ? weeklyTracks
    : [...tracks].sort((a, b) => {
        const scoreA = parseInt(a.plays || '0') + parseInt(a.downloads || '0');
        const scoreB = parseInt(b.plays || '0') + parseInt(b.downloads || '0');
        return scoreB - scoreA;
      }).slice(0, 8);

  const allTracks = [...tracks].sort(newestFirst).slice(0, 12);
  // Sort artists by most recent upload (newest first)
  const artistLatestUpload = new Map<string, string>();
  tracks.forEach(t => {
    const current = artistLatestUpload.get(t.artistId) || '';
    if ((t.addedDate || '') > current) {
      artistLatestUpload.set(t.artistId, t.addedDate || '');
    }
  });
  const topArtists = [...artists]
    .filter(a => artistLatestUpload.has(a.id))
    .sort((a, b) => (artistLatestUpload.get(b.id) || '').localeCompare(artistLatestUpload.get(a.id) || ''))
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Structured Data for SEO */}
      <JsonLd data={websiteJsonLd} />

      <FeaturedHero />

      {/* Most Played This Week — horizontal slider below the hero */}
      <section className="mt-8 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold font-heading">Most Played This Week</h2>
          <Link to="/music?filter=This+Week" className="text-xs text-muted-foreground hover:text-primary transition-colors">See All</Link>
        </div>
        {/* Genre quick filters — mobile only */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 lg:hidden">
          {genres.map(genre => (
            <Link
              key={genre}
              to={genre === 'All' ? '/music' : `/music?genre=${encodeURIComponent(genre)}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap glass text-muted-foreground hover:text-foreground transition-colors"
            >
              {genre}
            </Link>
          ))}
        </div>
        {displayWeekly.length > 0 ? (
          <div className="relative group">
            <Button variant="glass" size="icon"
              onClick={() => scrollWeekly('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass-strong flex items-center justify-center text-foreground hover:bg-glass-strong transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div
              ref={weeklyScrollRef}
              className="flex gap-1 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {displayWeekly.map(track => (
                <div key={track.id} className="flex-shrink-0 w-[118px] sm:w-[124px]" style={{ scrollSnapAlign: 'start' }}>
                  <TrackCard track={track} />
                </div>
              ))}
            </div>
            <Button variant="glass" size="icon"
              onClick={() => scrollWeekly('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass-strong flex items-center justify-center text-foreground hover:bg-glass-strong transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 bg-card rounded-lg">
            <Music className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tracks uploaded yet</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        {/* Music List */}
        <div className="lg:col-span-3">
          {allTracks.length > 0 ? (
            <div className="divide-y divide-border">
              {allTracks.map((track, i) => (
                <TrackListItem key={track.id} track={track} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-card rounded-lg">
              <Music className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No tracks available yet</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {topArtists.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-heading">Top Artists</h3>
                <Link to="/artists" className="text-xs text-muted-foreground hover:text-primary transition-colors">See All</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {topArtists.map(artist => {
                  const photoURL = artist.photoURL ? getProxiedUrl(artist.photoURL) : null;
                  return (
                    <Link key={artist.id} to={`/artist/${artist.id}`} className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full hover:scale-105 transition-transform overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }}>
                        {photoURL && (
                          <img 
                            src={photoURL} 
                            alt={artist.name} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Index;
