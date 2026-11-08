import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Music, Image, Camera, Edit } from 'lucide-react';
import TrackListItem from '@/components/TrackListItem';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserPlaylists, fetchAllPlaylists, createPlaylist, deletePlaylist, fetchTrackById, updatePlaylistCover, type PlaylistDoc } from '@/lib/firebaseServices';
import { getProxiedUrl } from '@/lib/mediaProxy';
import type { Track } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import VideoCard from '@/components/VideoCard';
import { getPlayHistory, clearPlayHistory, type HistoryEntry } from '@/lib/playHistory';

const PlaylistPage = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistDoc[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDoc | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [newName, setNewName] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingCover, setUpdatingCover] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => { setHistory(getPlayHistory()); }, []);
  const coverRef = useRef<HTMLInputElement>(null);
  const editCoverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    // Load all public playlists + user's own
    const allPlaylists = await fetchAllPlaylists();
    setPlaylists(allPlaylists);
    setLoading(false);
  };

  const handleCoverSelect = (file: File | null) => {
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      await createPlaylist(user.uid, newName.trim(), coverFile || undefined);
      setNewName('');
      setCoverFile(null);
      setCoverPreview(null);
      setDialogOpen(false);
      await loadPlaylists();
      toast({ title: 'Playlist created!' });
    } catch {
      toast({ title: 'Failed to create playlist', variant: 'destructive' });
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await deletePlaylist(id);
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
    await loadPlaylists();
    toast({ title: 'Playlist deleted' });
  };

  const handleSelectPlaylist = async (pl: PlaylistDoc) => {
    setSelectedPlaylist(pl);
    const tracks = await Promise.all(pl.trackIds.map(id => fetchTrackById(id)));
    setPlaylistTracks(tracks.filter(Boolean) as Track[]);
  };

  const handleUpdateCover = async (file: File | null) => {
    if (!file || !selectedPlaylist) return;
    setUpdatingCover(true);
    try {
      const newCoverURL = await updatePlaylistCover(selectedPlaylist.id, file);
      setSelectedPlaylist(prev => prev ? { ...prev, coverURL: newCoverURL } : prev);
      await loadPlaylists();
      toast({ title: 'Cover image updated!' });
    } catch {
      toast({ title: 'Failed to update cover', variant: 'destructive' });
    }
    setUpdatingCover(false);
  };

  const refreshSelectedPlaylist = async () => {
    const allPlaylists = await fetchAllPlaylists();
    setPlaylists(allPlaylists);
    if (selectedPlaylist) {
      const updated = allPlaylists.find(p => p.id === selectedPlaylist.id);
      if (updated) {
        setSelectedPlaylist(updated);
        const tracks = await Promise.all(updated.trackIds.map(id => fetchTrackById(id)));
        setPlaylistTracks(tracks.filter(Boolean) as Track[]);
      }
    }
  };

  const isOwner = (pl: PlaylistDoc) => user?.uid === pl.userId;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading mb-1">Playlists</h1>
          <p className="text-muted-foreground text-sm">Browse and manage playlists</p>
        </div>
        {user && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setCoverFile(null); setCoverPreview(null); setNewName(''); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full gap-1.5"><Plus className="w-4 h-4" />New Playlist</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Playlist</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <input type="file" accept="image/*" ref={coverRef} className="hidden" onChange={e => handleCoverSelect(e.target.files?.[0] || null)} />
                <div
                  onClick={() => coverRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  {coverPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={coverPreview} alt="Cover" className="w-16 h-16 rounded-lg object-cover" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{coverFile?.name}</p>
                        <p className="text-xs text-muted-foreground">Click to change cover image</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Upload Cover Image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG (optional)</p>
                    </>
                  )}
                </div>
                <Input
                  placeholder="Playlist name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={50}
                />
                <Button className="w-full rounded-full" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? 'Creating...' : 'Create Playlist'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedPlaylist ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedPlaylist(null)} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">← Back to playlists</button>
            {isOwner(selectedPlaylist) && (
              <Button size="sm" variant="outline" className="rounded-full gap-1.5 border-border" onClick={() => setAddTrackOpen(true)}>
                <Plus className="w-4 h-4" />Add Tracks
              </Button>
            )}
          </div>

          {/* Playlist header with cover */}
          <div className="flex items-end gap-4 mb-6">
            <div className="relative group flex-shrink-0">
              {selectedPlaylist.coverURL ? (
                <img src={getProxiedUrl(selectedPlaylist.coverURL)} alt={selectedPlaylist.name} className="w-24 h-24 rounded-xl object-cover shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center shadow-lg">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {isOwner(selectedPlaylist) && (
                <>
                  <input type="file" accept="image/*" ref={editCoverRef} className="hidden" onChange={e => handleUpdateCover(e.target.files?.[0] || null)} />
                  <button
                    onClick={() => editCoverRef.current?.click()}
                    disabled={updatingCover}
                    className="absolute inset-0 rounded-xl bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {updatingCover ? (
                      <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-background" />
                    )}
                  </button>
                </>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">{selectedPlaylist.name}</h2>
              <p className="text-sm text-muted-foreground">{playlistTracks.length} tracks</p>
            </div>
          </div>

          {playlistTracks.length > 0 ? (
            <div className="flex flex-col gap-1">
              {playlistTracks.map((track, i) => (
                <TrackListItem key={track.id} track={track} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-3">This playlist is empty.</p>
              {isOwner(selectedPlaylist) && (
                <Button size="sm" variant="outline" className="rounded-full gap-1.5 border-border" onClick={() => setAddTrackOpen(true)}>
                  <Plus className="w-4 h-4" />Add Tracks
                </Button>
              )}
            </div>
          )}

          {isOwner(selectedPlaylist) && (
            <AddToPlaylistModal
              open={addTrackOpen}
              onOpenChange={setAddTrackOpen}
              playlistId={selectedPlaylist.id}
              existingTrackIds={selectedPlaylist.trackIds}
              onTrackAdded={refreshSelectedPlaylist}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map(pl => (
            <div key={pl.id} className="bg-card rounded-xl p-4 hover:bg-surface-hover transition-colors cursor-pointer group relative" onClick={() => handleSelectPlaylist(pl)}>
              {pl.coverURL ? (
                <img src={getProxiedUrl(pl.coverURL)} alt={pl.name} className="w-full aspect-square rounded-lg object-cover mb-3" />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-secondary flex items-center justify-center mb-3">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <h3 className="font-semibold text-sm truncate">{pl.name}</h3>
              <p className="text-xs text-muted-foreground">{pl.trackIds.length} tracks</p>
              {isOwner(pl) && (
                <button onClick={e => { e.stopPropagation(); handleDelete(pl.id); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {playlists.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center col-span-full">No playlists yet. {user ? 'Create one to get started!' : 'Sign in to create one!'}</p>
          )}
        </div>
      )}
      {history.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold font-heading">Recently Played</h2>
            <Button variant="ghost" size="sm" onClick={() => { clearPlayHistory(); setHistory([]); }}>Clear</Button>
          </div>
          {history.some(h => h.kind === 'track') && (
            <div className="flex flex-col gap-1 mb-6">
              {history.filter(h => h.kind === 'track').map((h, i) => (
                <TrackListItem key={h.id} track={h.item as Track} index={i} />
              ))}
            </div>
          )}
          {history.some(h => h.kind === 'video') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.filter(h => h.kind === 'video').map(h => (
                <VideoCard key={h.id} video={h.item as any} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PlaylistPage;
