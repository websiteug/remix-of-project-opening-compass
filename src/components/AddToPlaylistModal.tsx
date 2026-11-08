import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Check, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchTracks, addTrackToPlaylist } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AddToPlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  existingTrackIds: string[];
  onTrackAdded: () => void;
}

const AddToPlaylistModal = ({ open, onOpenChange, playlistId, existingTrackIds, onTrackAdded }: AddToPlaylistModalProps) => {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSearchQuery('');
      setAddedIds(new Set());
      fetchTracks().then(tracks => {
        // Sort latest first by addedDate or createdAt
        const sorted = tracks.sort((a, b) => {
          const dateA = a.addedDate || '';
          const dateB = b.addedDate || '';
          return dateB.localeCompare(dateA);
        });
        setAllTracks(sorted);
        setLoading(false);
      });
    }
  }, [open]);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allTracks;
    return allTracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genre?.toLowerCase().includes(q)
    );
  }, [allTracks, searchQuery]);

  const handleAdd = async (trackId: string) => {
    setAddingId(trackId);
    try {
      await addTrackToPlaylist(playlistId, trackId);
      setAddedIds(prev => new Set(prev).add(trackId));
      onTrackAdded();
      toast({ title: 'Track added to playlist!' });
    } catch {
      toast({ title: 'Failed to add track', variant: 'destructive' });
    }
    setAddingId(null);
  };

  const isInPlaylist = (id: string) => existingTrackIds.includes(id) || addedIds.has(id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tracks to Playlist</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks by title, artist, or genre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[350px] -mx-2 px-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {searchQuery ? 'No tracks found matching your search.' : 'No tracks available yet.'}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredTracks.map(track => {
                const inPlaylist = isInPlaylist(track.id);
                const isAdding = addingId === track.id;
                const coverSrc = getProxiedUrl(track.coverURL);

                return (
                  <div key={track.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                    {coverSrc ? (
                      <img src={coverSrc} alt={track.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }}>
                        <Music className="w-4 h-4 text-white/80" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist} • {track.genre}</p>
                    </div>
                    {inPlaylist ? (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full flex-shrink-0"
                        onClick={() => handleAdd(track.id)}
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistModal;
