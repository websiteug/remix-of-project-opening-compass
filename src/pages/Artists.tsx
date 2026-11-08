import { siteOrigin } from '@/lib/siteUrl';
import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate } from '@/lib/router-compat';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchArtists, fetchTracks } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { useSEO } from '@/hooks/useSEO';
import { useAdmin } from '@/hooks/useAdmin';
import type { Artist, Track } from '@/lib/types';

interface ScoredArtist extends Artist {
  score: number;
}

const Artists = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();

  useSEO({
    title: 'Artists — LUO MUSIC STORE',
    description: 'Browse all artists on LUO MUSIC STORE. Discover Luo and Acholi music artists.',
    url: `${siteOrigin()}/artists`,
    type: 'website',
  });

  const [artists, setArtists] = useState<ScoredArtist[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [allArtists, allTracks] = await Promise.all([fetchArtists(), fetchTracks()]);

      // Build score map: plays + downloads per artist
      const scoreMap = new Map<string, number>();
      allTracks.forEach((t: Track) => {
        const score = parseInt(t.plays || '0') + parseInt(t.downloads || '0');
        scoreMap.set(t.artistId, (scoreMap.get(t.artistId) || 0) + score);
      });

      // Composite score: plays+downloads + followers + trackCount
      const scored: ScoredArtist[] = allArtists.map(a => ({
        ...a,
        score: (scoreMap.get(a.id) || 0) + parseInt(String(a.followers) || '0') + (a.trackCount || 0),
      }));

      scored.sort((a, b) => b.score - a.score);
      setArtists(scored);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return artists;
    const q = search.toLowerCase();
    return artists.filter(a =>
      (a.name || '').toLowerCase().includes(q) || (a.genre || '').toLowerCase().includes(q)
    );
  }, [artists, search]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold font-heading">Artists</h1>
          <span className="text-sm text-muted-foreground">({artists.length})</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search artists by name or genre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{search ? 'No artists match your search' : 'No artists yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((artist) => {
            const photoURL = artist.photoURL ? getProxiedUrl(artist.photoURL) : null;
            return (
              <Link
                key={artist.id}
                to={`/artist/${artist.id}`}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors"
              >
                <div className="relative">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={artist.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }}
                    />
                  )}
                  <div className="absolute inset-0 rounded-full bg-background/0 group-hover:bg-background/10 transition-colors" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate max-w-[120px]">
                    {artist.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{artist.genre}</p>
                  <p className="text-xs text-muted-foreground">{artist.followers} followers</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Artists;
