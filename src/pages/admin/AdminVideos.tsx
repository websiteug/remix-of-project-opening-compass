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
import { Search, Trash2, Edit, Plus, Play, Upload, Video } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import UploadProgressBar from '@/components/UploadProgressBar';
import {
  AdminVideo,
  fetchAllVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  fetchAllArtists,
  AdminArtist,
} from '@/lib/adminService';
import { uploadToR2 } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';
import { isGoogleDriveUrl } from '@/lib/googleDrive';
import GenreSelect from '@/components/GenreSelect';
import { isUploadGenre } from '@/lib/constants';

export default function AdminVideos() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<AdminVideo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newVideo, setNewVideo] = useState<Omit<AdminVideo, 'id'>>({
    title: '',
    artist: '',
    artistId: '',
    genre: '',
    duration: '',
    videoUrl: '',
    thumbnailUrl: '',
  });
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [autoThumbPreview, setAutoThumbPreview] = useState<string | null>(null);
  const [editAutoThumbPreview, setEditAutoThumbPreview] = useState<string | null>(null);
  const createVideoRef = useRef<HTMLInputElement>(null);
  const createThumbRef = useRef<HTMLInputElement>(null);
  const editVideoRef = useRef<HTMLInputElement>(null);
  const editThumbRef = useRef<HTMLInputElement>(null);

  function extractThumbnailFromVideo(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to extract thumbnail'));
          }
        }, 'image/jpeg', 0.85);
      };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load error')); };
    });
  }

  async function handleVideoFileChange(file: File, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setNewVideoFile(file);
    } else {
      setEditVideoFile(file);
    }
    try {
      const thumbFile = await extractThumbnailFromVideo(file);
      const previewUrl = URL.createObjectURL(thumbFile);
      if (mode === 'create') {
        setNewThumbnailFile(thumbFile);
        setAutoThumbPreview(previewUrl);
      } else {
        setEditThumbnailFile(thumbFile);
        setEditAutoThumbPreview(previewUrl);
      }
    } catch {
      console.warn('Could not auto-extract thumbnail');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [v, a] = await Promise.all([fetchAllVideos(), fetchAllArtists()]);
    setVideos(v);
    setArtists(a);
    setLoading(false);
  }

  const filteredVideos = videos.filter(
    (v) =>
      v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate() {
    if (!newVideo.title || !newVideo.artist) {
      toast({ title: 'Title and artist are required', variant: 'destructive' });
      return;
    }
    if (!isUploadGenre(newVideo.genre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    setUploadLabel('Uploading video...');
    try {
      let videoUrl = newVideo.videoUrl || '';
      let thumbnailUrl = 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg';
      if (newVideoFile) {
        setUploadLabel('Uploading video file...');
        setUploadProgress(0);
        videoUrl = await uploadToR2(newVideoFile, 'videos', (p) => setUploadProgress(p));
      }
      if (newThumbnailFile) {
        setUploadLabel('Uploading thumbnail...');
        setUploadProgress(0);
        thumbnailUrl = await uploadToR2(newThumbnailFile, 'thumbnails', (p) => setUploadProgress(p));
      }
      setUploadLabel('Saving...');
      await createVideo({ ...newVideo, videoUrl, thumbnailUrl });
      toast({ title: 'Video created successfully' });
      setCreateOpen(false);
      setNewVideo({ title: '', artist: '', artistId: '', genre: '', duration: '', videoUrl: '', thumbnailUrl: '' });
      setNewVideoFile(null);
      setNewThumbnailFile(null);
      setAutoThumbPreview(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error creating video', variant: 'destructive' });
    }
    setSaving(false);
    setUploadProgress(0);
    setUploadLabel('');
  }

  async function handleUpdate() {
    if (!selectedVideo) return;
    if (!isUploadGenre(selectedVideo.genre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    setUploadLabel('Updating video...');
    try {
      const { id, ...data } = selectedVideo;
      let videoUrl = data.videoUrl;
      let thumbnailUrl = data.thumbnailUrl || 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg';
      if (editVideoFile) {
        setUploadLabel('Uploading video file...');
        setUploadProgress(0);
        videoUrl = await uploadToR2(editVideoFile, 'videos', (p) => setUploadProgress(p));
      }
      if (editThumbnailFile) {
        setUploadLabel('Uploading thumbnail...');
        setUploadProgress(0);
        thumbnailUrl = await uploadToR2(editThumbnailFile, 'thumbnails', (p) => setUploadProgress(p));
      }
      setUploadLabel('Saving...');
      await updateVideo(id, { ...data, videoUrl, thumbnailUrl });
      toast({ title: 'Video updated successfully' });
      setEditOpen(false);
      setEditVideoFile(null);
      setEditThumbnailFile(null);
      setEditAutoThumbPreview(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error updating video', variant: 'destructive' });
    }
    setSaving(false);
    setUploadProgress(0);
    setUploadLabel('');
  }

  async function handleDelete() {
    if (!selectedVideo) return;
    try {
      await deleteVideo(selectedVideo.id);
      toast({ title: 'Video deleted successfully' });
      setDeleteOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting video', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Videos</h1>
            <p className="text-muted-foreground mt-1">Manage all videos on the platform</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
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
                  <TableHead>Views</TableHead>
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
                ) : filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No videos found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">{video.title}</TableCell>
                      <TableCell>{video.artist}</TableCell>
                      <TableCell>{video.genre || 'N/A'}</TableCell>
                      <TableCell>{video.duration || 'N/A'}</TableCell>
                      <TableCell>{video.views || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {video.videoUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(video.videoUrl, '_blank')}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedVideo(video);
                              setEditVideoFile(null);
                              setEditThumbnailFile(null);
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
                              setSelectedVideo(video);
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
              <DialogTitle>Add New Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist *</label>
                <Select
                  value={newVideo.artistId}
                  onValueChange={(value) => {
                    const artist = artists.find((a) => a.id === value);
                    setNewVideo((prev) => ({
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
                <label htmlFor="new-video-genre" className="text-sm font-medium">Genre *</label>
                <GenreSelect
                  id="new-video-genre"
                  value={newVideo.genre}
                  onValueChange={(genre) => setNewVideo((prev) => ({ ...prev, genre }))}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={newVideo.duration || ''}
                  onChange={(e) => setNewVideo((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="4:30"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  ref={createVideoRef}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFileChange(f, 'create'); }}
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
              </div>
              <div>
                <label className="text-sm font-medium">Or paste a video link</label>
                <Input
                  value={newVideo.videoUrl || ''}
                  onChange={(e) => setNewVideo((prev) => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/.../view"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Direct video URL or Google Drive share link (set to "Anyone with the link").
                  {isGoogleDriveUrl(newVideo.videoUrl || '') && " Google Drive detected - it will play in Drive's own player."}
                </p>
              </div>


            </div>
            {saving && (
              <UploadProgressBar progress={uploadProgress} label={uploadLabel} className="mb-2" />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Uploading...' : 'Create Video'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedVideo?.title || ''}
                  onChange={(e) =>
                    setSelectedVideo((prev) => prev && { ...prev, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Input
                  value={selectedVideo?.artist || ''}
                  onChange={(e) =>
                    setSelectedVideo((prev) => prev && { ...prev, artist: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="edit-video-genre" className="text-sm font-medium">Genre *</label>
                <GenreSelect
                  id="edit-video-genre"
                  value={selectedVideo?.genre}
                  onValueChange={(genre) => setSelectedVideo((prev) => prev && { ...prev, genre })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={selectedVideo?.duration || ''}
                  onChange={(e) =>
                    setSelectedVideo((prev) => prev && { ...prev, duration: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Replace Video</label>
                <input
                  type="file"
                  accept="video/*"
                  ref={editVideoRef}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFileChange(f, 'edit'); }}
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
              </div>
              <div>
                <label className="text-sm font-medium">Or paste a video link</label>
                <Input
                  value={selectedVideo?.videoUrl || ''}
                  onChange={(e) => setSelectedVideo((prev) => prev && { ...prev, videoUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Direct video URL or Google Drive share link (set to "Anyone with the link").
                  {isGoogleDriveUrl(selectedVideo?.videoUrl || '') && " Google Drive detected - it will play in Drive's own player."}
                </p>
              </div>


              <div>
                <label className="text-sm font-medium">Views</label>
                <Input
                  type="number"
                  value={selectedVideo?.views || 0}
                  onChange={(e) =>
                    setSelectedVideo((prev) =>
                      prev && { ...prev, views: parseInt(e.target.value) || 0 }
                    )
                  }
                />
              </div>
            </div>
            {saving && (
              <UploadProgressBar progress={uploadProgress} label={uploadLabel} className="mb-2" />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
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
              <DialogTitle>Delete Video</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedVideo?.title}</strong>?
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