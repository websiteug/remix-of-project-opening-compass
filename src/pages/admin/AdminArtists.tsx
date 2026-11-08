import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Trash2, Edit, Plus, Upload, User } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminArtist,
  fetchAllArtists,
  createArtist,
  updateArtist,
  deleteArtist,
} from '@/lib/adminService';
import { uploadToR2 } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';

const initialArtist: Omit<AdminArtist, 'id'> = {
  name: '',
  email: '',
  genre: '',
  bio: '',
  phone: '',
  followers: 0,
  trackCount: 0,
};

export default function AdminArtists() {
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<AdminArtist | null>(null);
  const [newArtist, setNewArtist] = useState(initialArtist);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const createPhotoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadArtists();
  }, []);

  async function loadArtists() {
    setLoading(true);
    const data = await fetchAllArtists();
    setArtists(data);
    setLoading(false);
  }

  const filteredArtists = artists.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreateArtist() {
    if (!newArtist.name) {
      toast({ title: 'Artist name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let photoURL = '';
      if (newPhotoFile) {
        photoURL = await uploadToR2(newPhotoFile, 'artists');
      }
      await createArtist({ ...newArtist, ...(photoURL ? { photoURL } as any : {}) });
      toast({ title: 'Artist created successfully' });
      setCreateOpen(false);
      setNewArtist(initialArtist);
      setNewPhotoFile(null);
      loadArtists();
    } catch (err) {
      toast({ title: 'Error creating artist', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleUpdateArtist() {
    if (!selectedArtist) return;
    setSaving(true);
    try {
      const { id, ...data } = selectedArtist;
      let photoURL: string | undefined;
      if (editPhotoFile) {
        photoURL = await uploadToR2(editPhotoFile, 'artists');
      }
      await updateArtist(id, { ...data, ...(photoURL ? { photoURL } as any : {}) });
      toast({ title: 'Artist updated successfully' });
      setEditOpen(false);
      setEditPhotoFile(null);
      loadArtists();
    } catch (err) {
      toast({ title: 'Error updating artist', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDeleteArtist() {
    if (!selectedArtist) return;
    try {
      await deleteArtist(selectedArtist.id);
      toast({ title: 'Artist deleted successfully' });
      setDeleteOpen(false);
      loadArtists();
    } catch (err) {
      toast({ title: 'Error deleting artist', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Artists</h1>
            <p className="text-muted-foreground mt-1">Manage all artists on the platform</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search artists..."
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
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Tracks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredArtists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No artists found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArtists.map((artist) => (
                    <TableRow key={artist.id}>
                      <TableCell>
                        {(artist as any).photoURL ? (
                          <img
                            src={(artist as any).photoURL}
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{artist.name}</TableCell>
                      <TableCell>{artist.email || 'N/A'}</TableCell>
                      <TableCell>{artist.genre || 'N/A'}</TableCell>
                      <TableCell>{artist.followers || 0}</TableCell>
                      <TableCell>{artist.trackCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedArtist(artist);
                              setEditPhotoFile(null);
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
                              setSelectedArtist(artist);
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
              <DialogTitle>Add New Artist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={createPhotoRef}
                  className="hidden"
                  onChange={(e) => setNewPhotoFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => createPhotoRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {newPhotoFile ? newPhotoFile.name : 'Upload profile picture'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Artist Name *</label>
                <Input
                  value={newArtist.name}
                  onChange={(e) => setNewArtist((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Artist name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newArtist.email || ''}
                  onChange={(e) => setNewArtist((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="artist@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Genre</label>
                <Input
                  value={newArtist.genre || ''}
                  onChange={(e) => setNewArtist((prev) => ({ ...prev, genre: e.target.value }))}
                  placeholder="e.g., Afrobeat"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newArtist.phone || ''}
                  onChange={(e) => setNewArtist((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+256..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={newArtist.bio || ''}
                  onChange={(e) => setNewArtist((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Artist biography"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateArtist} disabled={saving}>
                {saving ? 'Uploading...' : 'Create Artist'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Artist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={editPhotoRef}
                  className="hidden"
                  onChange={(e) => setEditPhotoFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => editPhotoRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {editPhotoFile ? editPhotoFile.name : 'Upload new photo (optional)'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Artist Name</label>
                <Input
                  value={selectedArtist?.name || ''}
                  onChange={(e) =>
                    setSelectedArtist((prev) => prev && { ...prev, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={selectedArtist?.email || ''}
                  onChange={(e) =>
                    setSelectedArtist((prev) => prev && { ...prev, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Genre</label>
                <Input
                  value={selectedArtist?.genre || ''}
                  onChange={(e) =>
                    setSelectedArtist((prev) => prev && { ...prev, genre: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={selectedArtist?.phone || ''}
                  onChange={(e) =>
                    setSelectedArtist((prev) => prev && { ...prev, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Followers</label>
                <Input
                  type="number"
                  value={selectedArtist?.followers || 0}
                  onChange={(e) =>
                    setSelectedArtist((prev) =>
                      prev && { ...prev, followers: parseInt(e.target.value) || 0 }
                    )
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={selectedArtist?.bio || ''}
                  onChange={(e) =>
                    setSelectedArtist((prev) => prev && { ...prev, bio: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateArtist} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Artist</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedArtist?.name}</strong>? This will
              remove all their data.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteArtist}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}