import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Search, Trash2, Edit, Plus, Play, Upload, Video, Youtube, Link } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import type { AdminSelebTalk, AdminArtist } from '@/lib/adminService';
import {
  fetchAllSelebTalks,
  createSelebTalk,
  updateSelebTalk,
  deleteSelebTalk,
  fetchAllArtists,
} from '@/lib/adminService';
import { uploadToR2 } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';

export default function AdminSelebTalk() {
  const [talks, setTalks] = useState<AdminSelebTalk[]>([]);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTalk, setSelectedTalk] = useState<AdminSelebTalk | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newTalk, setNewTalk] = useState<Omit<AdminSelebTalk, 'id'>>({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    artistId: '',
    artistName: '',
    duration: '',
  });
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newThumbFile, setNewThumbFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [createVideoSource, setCreateVideoSource] = useState<'file' | 'youtube'>('file');
  const [editVideoSource, setEditVideoSource] = useState<'file' | 'youtube'>('file');
  const [createYoutubeUrl, setCreateYoutubeUrl] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const createVideoRef = useRef<HTMLInputElement>(null);
  const createThumbRef = useRef<HTMLInputElement>(null);
  const editVideoRef = useRef<HTMLInputElement>(null);
  const editThumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [t, a] = await Promise.all([fetchAllSelebTalks(), fetchAllArtists()]);
    setTalks(t);
    setArtists(a);
    setLoading(false);
  }

  const filteredTalks = talks.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate() {
    if (!newTalk.title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let videoUrl = newTalk.videoUrl || '';
      let thumbnailUrl = newTalk.thumbnailUrl || '';
      if (createVideoSource === 'youtube' && createYoutubeUrl) {
        videoUrl = createYoutubeUrl;
      } else if (newVideoFile) {
        videoUrl = await uploadToR2(newVideoFile, 'selebtalk');
      }
      if (newThumbFile) {
        thumbnailUrl = await uploadToR2(newThumbFile, 'thumbnails');
      }
      await createSelebTalk({ ...newTalk, videoUrl, thumbnailUrl });
      toast({ title: 'GUIDE created successfully' });
      setCreateOpen(false);
      setNewTalk({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        artistId: '',
        artistName: '',
        duration: '',
      });
      setNewVideoFile(null);
      setNewThumbFile(null);
      setCreateVideoSource('file');
      setCreateYoutubeUrl('');
      loadData();
    } catch (err) {
      toast({ title: 'Error creating GUIDE', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!selectedTalk) return;
    setSaving(true);
    try {
      const { id, ...data } = selectedTalk;
      let videoUrl = data.videoUrl;
      let thumbnailUrl = data.thumbnailUrl;
      if (editVideoSource === 'youtube' && editYoutubeUrl) {
        videoUrl = editYoutubeUrl;
      } else if (editVideoFile) {
        videoUrl = await uploadToR2(editVideoFile, 'selebtalk');
      }
      if (editThumbFile) {
        thumbnailUrl = await uploadToR2(editThumbFile, 'thumbnails');
      }
      await updateSelebTalk(id, { ...data, videoUrl, thumbnailUrl });
      toast({ title: 'GUIDE updated successfully' });
      setEditOpen(false);
      setEditVideoFile(null);
      setEditThumbFile(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error updating GUIDE', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedTalk) return;
    try {
      await deleteSelebTalk(selectedTalk.id);
      toast({ title: 'GUIDE deleted successfully' });
      setDeleteOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting GUIDE', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">GUIDE</h1>
            <p className="text-muted-foreground mt-1">Manage GUIDE content</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Seleb Talk
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search seleb talks..."
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
                  <TableHead>Duration</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTalks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No seleb talks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTalks.map((talk) => (
                    <TableRow key={talk.id}>
                      <TableCell className="font-medium">{talk.title}</TableCell>
                      <TableCell>{talk.artistName || 'N/A'}</TableCell>
                      <TableCell>{talk.duration || 'N/A'}</TableCell>
                      <TableCell>{talk.views || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {talk.videoUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(talk.videoUrl, '_blank')}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTalk(talk);
                              setEditVideoFile(null);
                              setEditThumbFile(null);
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
                              setSelectedTalk(talk);
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
              <DialogTitle>Add New Seleb Talk</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTalk.title}
                  onChange={(e) => setNewTalk((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTalk.description || ''}
                  onChange={(e) =>
                    setNewTalk((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Select
                  value={newTalk.artistId}
                  onValueChange={(value) => {
                    const artist = artists.find((a) => a.id === value);
                    setNewTalk((prev) => ({
                      ...prev,
                      artistId: value,
                      artistName: artist?.name || '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist (optional)" />
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
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={newTalk.duration || ''}
                  onChange={(e) => setNewTalk((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="15:30"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Video Source</label>
                <div className="flex gap-2 mt-1 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={createVideoSource === 'file' ? 'default' : 'outline'}
                    onClick={() => setCreateVideoSource('file')}
                  >
                    <Upload className="w-3 h-3 mr-1" /> Upload File
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={createVideoSource === 'youtube' ? 'default' : 'outline'}
                    onClick={() => setCreateVideoSource('youtube')}
                  >
                    <Youtube className="w-3 h-3 mr-1" /> YouTube URL
                  </Button>
                </div>
                {createVideoSource === 'file' ? (
                  <>
                    <input
                      type="file"
                      accept="video/*"
                      ref={createVideoRef}
                      className="hidden"
                      onChange={(e) => setNewVideoFile(e.target.files?.[0] || null)}
                    />
                    <div
                      onClick={() => createVideoRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <Video className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {newVideoFile ? newVideoFile.name : 'Upload video file'}
                      </p>
                    </div>
                  </>
                ) : (
                  <Input
                    value={createYoutubeUrl}
                    onChange={(e) => setCreateYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Thumbnail</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={createThumbRef}
                  className="hidden"
                  onChange={(e) => setNewThumbFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => createThumbRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {newThumbFile ? newThumbFile.name : 'Upload thumbnail'}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Uploading...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Seleb Talk</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedTalk?.title || ''}
                  onChange={(e) =>
                    setSelectedTalk((prev) => prev && { ...prev, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={selectedTalk?.description || ''}
                  onChange={(e) =>
                    setSelectedTalk((prev) => prev && { ...prev, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={selectedTalk?.duration || ''}
                  onChange={(e) =>
                    setSelectedTalk((prev) => prev && { ...prev, duration: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Replace Video</label>
                <div className="flex gap-2 mt-1 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={editVideoSource === 'file' ? 'default' : 'outline'}
                    onClick={() => setEditVideoSource('file')}
                  >
                    <Upload className="w-3 h-3 mr-1" /> Upload File
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editVideoSource === 'youtube' ? 'default' : 'outline'}
                    onClick={() => setEditVideoSource('youtube')}
                  >
                    <Youtube className="w-3 h-3 mr-1" /> YouTube URL
                  </Button>
                </div>
                {editVideoSource === 'file' ? (
                  <>
                    <input
                      type="file"
                      accept="video/*"
                      ref={editVideoRef}
                      className="hidden"
                      onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)}
                    />
                    <div
                      onClick={() => editVideoRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <Video className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {editVideoFile ? editVideoFile.name : 'Upload new video (optional)'}
                      </p>
                    </div>
                  </>
                ) : (
                  <Input
                    value={editYoutubeUrl}
                    onChange={(e) => setEditYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Replace Thumbnail</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={editThumbRef}
                  className="hidden"
                  onChange={(e) => setEditThumbFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => editThumbRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {editThumbFile ? editThumbFile.name : 'Upload new thumbnail (optional)'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Views</label>
                <Input
                  type="number"
                  value={selectedTalk?.views || 0}
                  onChange={(e) =>
                    setSelectedTalk((prev) =>
                      prev && { ...prev, views: parseInt(e.target.value) || 0 }
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
              <DialogTitle>Delete Seleb Talk</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedTalk?.title}</strong>?
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