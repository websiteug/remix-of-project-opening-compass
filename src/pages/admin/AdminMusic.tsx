import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Trash2, Edit, Plus, Play, Upload, Music } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminTrack,
  fetchAllTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  fetchAllArtists,
  AdminArtist,
} from '@/lib/adminService';
import { uploadToR2 } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_COVER_URL } from '@/lib/constants';
import { isGoogleDriveUrl } from '@/lib/googleDrive';
import GenreSelect from '@/components/GenreSelect';
import { isUploadGenre } from '@/lib/constants';

export default function AdminMusic() {
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<AdminTrack | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newTrack, setNewTrack] = useState<Omit<AdminTrack, 'id'>>({
    title: '',
    artist: '',
    artistId: '',
    genre: '',
    duration: '',
    audioUrl: '',
    coverUrl: '',
  });
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const createAudioRef = useRef<HTMLInputElement>(null);
  const createCoverRef = useRef<HTMLInputElement>(null);
  const editAudioRef = useRef<HTMLInputElement>(null);
  const editCoverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [t, a] = await Promise.all([fetchAllTracks(), fetchAllArtists()]);
    setTracks(t);
    setArtists(a);
    setLoading(false);
  }

  const filteredTracks = tracks.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate() {
    if (!newTrack.title || !newTrack.artist) {
      toast({ title: 'Title and artist are required', variant: 'destructive' });
      return;
    }
    if (!isUploadGenre(newTrack.genre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let audioUrl = newTrack.audioUrl || '';
      const coverUrl = DEFAULT_COVER_URL;
      if (newAudioFile) {
        audioUrl = await uploadToR2(newAudioFile, 'tracks');
      }
      await createTrack({ ...newTrack, audioUrl, coverUrl });
      toast({ title: 'Track created successfully' });
      setCreateOpen(false);
      setNewTrack({ title: '', artist: '', artistId: '', genre: '', duration: '', audioUrl: '', coverUrl: '' });
      setNewAudioFile(null);
      setNewCoverFile(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error creating track', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!selectedTrack) return;
    if (!isUploadGenre(selectedTrack.genre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        title: selectedTrack.title || '',
        artist: selectedTrack.artist || '',
        genre: selectedTrack.genre || '',
        duration: selectedTrack.duration || '',
        plays: selectedTrack.plays || 0,
      };
      if (selectedTrack.artistId) updateData.artistId = selectedTrack.artistId;
      // Handle audio URL - keep existing or upload new
      if (editAudioFile) {
        const newAudioUrl = await uploadToR2(editAudioFile, 'tracks');
        updateData.audioUrl = newAudioUrl;
        updateData.audioURL = newAudioUrl;
      } else if (selectedTrack.audioUrl !== undefined) {
        updateData.audioUrl = selectedTrack.audioUrl || '';
        updateData.audioURL = selectedTrack.audioUrl || '';
      }
      // Always use default cover
      updateData.coverUrl = DEFAULT_COVER_URL;
      updateData.coverURL = DEFAULT_COVER_URL;
      await updateTrack(selectedTrack.id, updateData);
      toast({ title: 'Track updated successfully' });
      setEditOpen(false);
      setEditAudioFile(null);
      setEditCoverFile(null);
      loadData();
    } catch (err) {
      console.error('Error updating track:', err);
      toast({ title: 'Error updating track', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedTrack) return;
    try {
      await deleteTrack(selectedTrack.id);
      toast({ title: 'Track deleted successfully' });
      setDeleteOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting track', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Music</h1>
            <p className="text-muted-foreground mt-1">Manage all tracks on the platform</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Track
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Plays</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTracks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tracks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTracks.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell className="font-medium">{track.title}</TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell>{track.genre || 'N/A'}</TableCell>
                      <TableCell>{track.duration || 'N/A'}</TableCell>
                      <TableCell>{track.plays || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {track.audioUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(track.audioUrl, '_blank')}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTrack(track);
                              setEditAudioFile(null);
                              setEditCoverFile(null);
                              setEditOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedTrack(track);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTrack.title}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist *</label>
                <Select
                  value={newTrack.artistId}
                  onValueChange={(value) => {
                    const artist = artists.find((a) => a.id === value);
                    setNewTrack((prev) => ({
                      ...prev,
                      artistId: value,
                      artist: artist?.name || '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="new-track-genre" className="text-sm font-medium">Genre *</label>
                <GenreSelect
                  id="new-track-genre"
                  value={newTrack.genre}
                  onValueChange={(genre) => setNewTrack((prev) => ({ ...prev, genre }))}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={newTrack.duration || ''}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="3:45"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Audio File</label>
                <input
                  type="file"
                  accept="audio/*"
                  ref={createAudioRef}
                  className="hidden"
                  onChange={(e) => setNewAudioFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => createAudioRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Music className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {newAudioFile ? newAudioFile.name : 'Upload audio file'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Or paste an audio link</label>
                <Input
                  value={newTrack.audioUrl || ''}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, audioUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/.../view"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Direct audio URL or Google Drive share link (set to "Anyone with the link").
                  {isGoogleDriveUrl(newTrack.audioUrl || '') && " Google Drive detected - it will play in Drive's own player."}
                </p>
              </div>
               <div>
                <label className="text-sm font-medium">Cover Image</label>
                <div className="border border-border rounded-xl p-3 flex items-center gap-3">
                  <img src={DEFAULT_COVER_URL} alt="Default cover" className="w-12 h-12 rounded-lg object-cover" />
                  <p className="text-xs text-muted-foreground">Default cover will be used</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Uploading...' : 'Create Track'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedTrack?.title || ''}
                  onChange={(e) =>
                    setSelectedTrack((prev) => prev && { ...prev, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Input
                  value={selectedTrack?.artist || ''}
                  onChange={(e) =>
                    setSelectedTrack((prev) => prev && { ...prev, artist: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="edit-track-genre" className="text-sm font-medium">Genre *</label>
                <GenreSelect
                  id="edit-track-genre"
                  value={selectedTrack?.genre}
                  onValueChange={(genre) => setSelectedTrack((prev) => prev && { ...prev, genre })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={selectedTrack?.duration || ''}
                  onChange={(e) =>
                    setSelectedTrack((prev) => prev && { ...prev, duration: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Replace Audio</label>
                <input
                  type="file"
                  accept="audio/*"
                  ref={editAudioRef}
                  className="hidden"
                  onChange={(e) => setEditAudioFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => editAudioRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Music className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {editAudioFile ? editAudioFile.name : 'Upload new audio (optional)'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Or paste an audio link</label>
                <Input
                  value={selectedTrack?.audioUrl || ''}
                  onChange={(e) => setSelectedTrack((prev) => prev && { ...prev, audioUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Direct audio URL or Google Drive share link (set to "Anyone with the link").
                  {isGoogleDriveUrl(selectedTrack?.audioUrl || '') && " Google Drive detected - it will play in Drive's own player."}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Cover Image</label>
                <div className="border border-border rounded-xl p-3 flex items-center gap-3">
                  <img src={DEFAULT_COVER_URL} alt="Default cover" className="w-12 h-12 rounded-lg object-cover" />
                  <p className="text-xs text-muted-foreground">Default cover is used</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Plays</label>
                <Input
                  type="number"
                  value={selectedTrack?.plays || 0}
                  onChange={(e) =>
                    setSelectedTrack((prev) =>
                      prev && { ...prev, plays: parseInt(e.target.value) || 0 }
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Track</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedTrack?.title}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}