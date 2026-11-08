import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { Search, Trash2, Edit, Plus, Image as ImageIcon, Upload } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminHeroSlide,
  fetchAllHeroSlides,
  updateHeroSlide as adminUpdateHeroSlide,
  deleteHeroSlide,
  fetchAllArtists,
  fetchAllTracks,
  AdminArtist,
  AdminTrack,
} from '@/lib/adminService';
import { addHeroSlide } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<AdminHeroSlide[]>([]);
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [allTracks, setAllTracks] = useState<AdminTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlide, setSelectedSlide] = useState<AdminHeroSlide | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newBadge, setNewBadge] = useState('Featured');
  const [newArtistId, setNewArtistId] = useState('');
  const [newCtaText, setNewCtaText] = useState('Listen Now');
  const [newOrder, setNewOrder] = useState(0);
  const [newActive, setNewActive] = useState(true);
  const [newDurationDays, setNewDurationDays] = useState(7);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newLinkType, setNewLinkType] = useState<'track' | ''>('');
  const [newLinkId, setNewLinkId] = useState('');
  const createFileRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [s, a, t] = await Promise.all([fetchAllHeroSlides(), fetchAllArtists(), fetchAllTracks()]);
    setSlides(s);
    setArtists(a);
    setAllTracks(t);
    setLoading(false);
  }

  const filteredSlides = slides.filter(
    (s) =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate() {
    if (!newTitle.trim() || !newImageFile) {
      toast({ title: 'Title and image file are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const artist = artists.find((a) => a.id === newArtistId);
      await addHeroSlide({
        title: newTitle,
        subtitle: newSubtitle,
        artist: artist?.name || 'Admin',
        artistId: newArtistId || 'admin',
        badge: newBadge || 'Featured',
        imageFile: newImageFile,
        ctaText: newCtaText,
        durationDays: newDurationDays,
        linkedContentId: newLinkId || undefined,
        linkedContentType: newLinkType === 'track' ? 'track' : undefined,
      });
      toast({ title: 'Hero slide created successfully' });
      setCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch (err) {
      toast({ title: 'Error creating hero slide', variant: 'destructive' });
    }
    setSaving(false);
  }

  function resetCreateForm() {
    setNewTitle('');
    setNewSubtitle('');
    setNewBadge('Featured');
    setNewArtistId('');
    setNewCtaText('Listen Now');
    setNewOrder(0);
    setNewActive(true);
    setNewDurationDays(7);
    setNewImageFile(null);
    setNewLinkType('');
    setNewLinkId('');
  }

  async function handleUpdate() {
    if (!selectedSlide) return;
    setSaving(true);
    try {
      const { id, createdAt, ...rest } = selectedSlide;
      if (editImageFile) {
        const { updateHeroSlide: fbUpdateHeroSlide } = await import('@/lib/firebaseServices');
        await fbUpdateHeroSlide(id, {
          title: selectedSlide.title,
          subtitle: selectedSlide.subtitle,
          imageFile: editImageFile,
        });
        // Also update the other fields that fbUpdateHeroSlide doesn't handle
        await adminUpdateHeroSlide(id, {
          badge: selectedSlide.badge,
          ctaText: selectedSlide.ctaText,
          linkedContentId: selectedSlide.linkedContentId,
          linkedContentType: selectedSlide.linkedContentType,
          order: selectedSlide.order,
          active: selectedSlide.active,
        });
      } else {
        await adminUpdateHeroSlide(id, rest);
      }
      toast({ title: 'Hero slide updated successfully' });
      setEditOpen(false);
      setEditImageFile(null);
      loadData();
    } catch (err) {
      toast({ title: 'Error updating hero slide', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedSlide) return;
    try {
      await deleteHeroSlide(selectedSlide.id);
      toast({ title: 'Hero slide deleted successfully' });
      setDeleteOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting hero slide', variant: 'destructive' });
    }
  }

  async function toggleActive(slide: AdminHeroSlide) {
    try {
      await adminUpdateHeroSlide(slide.id, { active: !slide.active });
      loadData();
    } catch (err) {
      toast({ title: 'Error updating slide', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hero Slides</h1>
            <p className="text-muted-foreground mt-1">Manage homepage hero slides</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search slides..."
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
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Active</TableHead>
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
                ) : filteredSlides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hero slides found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSlides.map((slide) => (
                    <TableRow key={slide.id}>
                      <TableCell>
                        {slide.imageUrl ? (
                          <img
                            src={slide.imageUrl}
                            alt={slide.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{slide.title}</TableCell>
                      <TableCell>{slide.artistName || 'N/A'}</TableCell>
                      <TableCell>{slide.order || 0}</TableCell>
                      <TableCell>
                        <Switch
                          checked={slide.active !== false}
                          onCheckedChange={() => toggleActive(slide)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSlide(slide);
                              setEditImageFile(null);
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
                              setSelectedSlide(slide);
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
              <DialogTitle>Add New Hero Slide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subtitle</label>
                <Input
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Badge</label>
                <Input
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="e.g. Featured, New, Hot"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CTA Text</label>
                <Input
                  value={newCtaText}
                  onChange={(e) => setNewCtaText(e.target.value)}
                  placeholder="Listen Now"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Display Duration</label>
                <Select
                  value={String(newDurationDays)}
                  onValueChange={(v) => setNewDurationDays(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                    <SelectItem value="90">3 Months</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={createFileRef}
                  className="hidden"
                  onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => createFileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {newImageFile ? newImageFile.name : 'Click to upload image'}
                  </p>
                </div>
               </div>
              <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                <label className="text-sm font-medium">Link to Music (optional)</label>
                <Select
                  value={newLinkType || 'none'}
                  onValueChange={(v) => { setNewLinkType(v === 'none' ? '' : v as 'track'); setNewLinkId(''); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No link</SelectItem>
                    <SelectItem value="track">Music Track</SelectItem>
                  </SelectContent>
                </Select>
                {newLinkType === 'track' && (
                  <Select value={newLinkId} onValueChange={setNewLinkId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTracks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title} — {t.artist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Artist</label>
                <Select
                  value={newArtistId}
                  onValueChange={setNewArtistId}
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={newActive}
                  onCheckedChange={setNewActive}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Uploading...' : 'Create Slide'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Hero Slide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedSlide?.title || ''}
                  onChange={(e) =>
                    setSelectedSlide((prev) => prev && { ...prev, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subtitle</label>
                <Input
                  value={selectedSlide?.subtitle || ''}
                  onChange={(e) =>
                    setSelectedSlide((prev) => prev && { ...prev, subtitle: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Badge</label>
                <Input
                  value={selectedSlide?.badge || ''}
                  onChange={(e) =>
                    setSelectedSlide((prev) => prev && { ...prev, badge: e.target.value })
                  }
                  placeholder="e.g. Featured, New, Hot"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CTA Text</label>
                <Input
                  value={selectedSlide?.ctaText || ''}
                  onChange={(e) =>
                    setSelectedSlide((prev) => prev && { ...prev, ctaText: e.target.value })
                  }
                  placeholder="Listen Now"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Change Image</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={editFileRef}
                  className="hidden"
                  onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                />
                <div
                  onClick={() => editFileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {editImageFile ? editImageFile.name : 'Upload new image (optional)'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                <label className="text-sm font-medium">Link to Content (optional)</label>
                <Select
                  value={selectedSlide?.linkedContentType || 'none'}
                  onValueChange={(v) =>
                    setSelectedSlide((prev) =>
                      prev && { ...prev, linkedContentType: v === 'none' ? '' : v as 'track' | 'video', linkedContentId: '' }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No link</SelectItem>
                    <SelectItem value="track">Music Track</SelectItem>
                  </SelectContent>
                </Select>
                {selectedSlide?.linkedContentType === 'track' && (
                  <Select
                    value={selectedSlide?.linkedContentId || ''}
                    onValueChange={(v) =>
                      setSelectedSlide((prev) => prev && { ...prev, linkedContentId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTracks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title} — {t.artist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Order</label>
                <Input
                  type="number"
                  value={selectedSlide?.order || 0}
                  onChange={(e) =>
                    setSelectedSlide((prev) =>
                      prev && { ...prev, order: parseInt(e.target.value) || 0 }
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedSlide?.active !== false}
                  onCheckedChange={(checked) =>
                    setSelectedSlide((prev) => prev && { ...prev, active: checked })
                  }
                />
                <label className="text-sm font-medium">Active</label>
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
              <DialogTitle>Delete Hero Slide</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedSlide?.title}</strong>?
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