import { useState, useEffect, useRef } from 'react';
import { Search, X, Music, User, Video } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { searchAll } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track, Artist, MusicVideo } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const SearchModal = ({ open, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ tracks: Track[]; artists: Artist[]; videos: MusicVideo[] }>({ tracks: [], artists: [], videos: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { play } = usePlayer();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ tracks: [], artists: [], videos: [] });
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ tracks: [], artists: [], videos: [] });
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await searchAll(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (!open) return null;

  const hasResults = results.tracks.length > 0 || results.artists.length > 0 || results.videos.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-xl mx-auto mt-20 px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tracks, artists, videos..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && query.trim() && !hasResults && (
              <p className="text-sm text-muted-foreground text-center py-8">No results found for "{query}"</p>
            )}

            {!loading && hasResults && (
              <div className="py-2">
                {results.tracks.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tracks</p>
                    {results.tracks.slice(0, 5).map(track => (
                      <button
                        key={track.id}
                        onClick={() => { play(track, results.tracks); onClose(); }}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        {track.coverURL ? (
                          <img src={getProxiedUrl(track.coverURL)} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }}>
                            <Music className="w-4 h-4 text-background" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.artists.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Artists</p>
                    {results.artists.slice(0, 5).map(artist => (
                      <Link
                        key={artist.id}
                        to={`/artist/${artist.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {(artist as any).photoURL ? (
                          <img src={getProxiedUrl((artist as any).photoURL)} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }}>
                            <User className="w-4 h-4 text-background" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{artist.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{artist.genre}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.videos.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Videos</p>
                    {results.videos.slice(0, 5).map(video => (
                      <Link
                        key={video.id}
                        to={`/video/${video.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        {video.thumbnailURL ? (
                          <img src={getProxiedUrl(video.thumbnailURL)} alt="" className="w-12 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${video.gradientFrom}, ${video.gradientTo})` }}>
                            <Video className="w-4 h-4 text-background" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{video.artist}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
