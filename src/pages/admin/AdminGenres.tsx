import { useEffect, useState } from 'react';
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
import { Search, Trash2, Edit, Plus } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminGenre,
  fetchAllGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} from '@/lib/adminService';
import { toast } from '@/hooks/use-toast';

export default function AdminGenres() {
  const [genres, setGenres] = useState<AdminGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<AdminGenre | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newGenre, setNewGenre] = useState<Omit<AdminGenre, 'id'>>({
    name: '',
    description: '',
    order: 0,
  });

  useEffect(() => {
    loadGenres();
  }, []);

  async function loadGenres() {
    setLoading(true);
    const data = await fetchAllGenres();
    setGenres(data);
    setLoading(false);
  }

  const filteredGenres = genres.filter((g) =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate() {
    if (!newGenre.name) {
      toast({ title: 'Genre name is required', variant: 'destructive' });
      return;
    }
    try {
      await createGenre(newGenre);
      toast({ title: 'Genre created successfully' });
      setCreateOpen(false);
      setNewGenre({ name: '', description: '', order: 0 });
      loadGenres();
    } catch (err) {
      toast({ title: 'Error creating genre', variant: 'destructive' });
    }
  }

  async function handleUpdate() {
    if (!selectedGenre) return;
    try {
      const { id, ...data } = selectedGenre;
      await updateGenre(id, data);
      toast({ title: 'Genre updated successfully' });
      setEditOpen(false);
      loadGenres();
    } catch (err) {
      toast({ title: 'Error updating genre', variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!selectedGenre) return;
    try {
      await deleteGenre(selectedGenre.id);
      toast({ title: 'Genre deleted successfully' });
      setDeleteOpen(false);
      loadGenres();
    } catch (err) {
      toast({ title: 'Error deleting genre', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Genres</h1>
            <p className="text-muted-foreground mt-1">Manage music genres</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Genre
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search genres..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredGenres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No genres found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGenres.map((genre) => (
                    <TableRow key={genre.id}>
                      <TableCell className="font-medium">{genre.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {genre.description || 'N/A'}
                      </TableCell>
                      <TableCell>{genre.order || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedGenre(genre);
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
                              setSelectedGenre(genre);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Genre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={newGenre.name}
                  onChange={(e) => setNewGenre((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Afrobeat"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newGenre.description || ''}
                  onChange={(e) =>
                    setNewGenre((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Genre description"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Order</label>
                <Input
                  type="number"
                  value={newGenre.order || 0}
                  onChange={(e) =>
                    setNewGenre((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Genre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Genre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={selectedGenre?.name || ''}
                  onChange={(e) =>
                    setSelectedGenre((prev) => prev && { ...prev, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={selectedGenre?.description || ''}
                  onChange={(e) =>
                    setSelectedGenre((prev) => prev && { ...prev, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Order</label>
                <Input
                  type="number"
                  value={selectedGenre?.order || 0}
                  onChange={(e) =>
                    setSelectedGenre((prev) =>
                      prev && { ...prev, order: parseInt(e.target.value) || 0 }
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Genre</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedGenre?.name}</strong>?
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
