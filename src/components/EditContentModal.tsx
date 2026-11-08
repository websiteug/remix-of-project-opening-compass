import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GenreSelect from '@/components/GenreSelect';
import { isUploadGenre } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';


interface EditContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'music' | 'video';
  item: { id: string; title: string; genre?: string; description?: string } | null;
  onSave: (id: string, data: { title: string; genre: string; description: string }) => Promise<void>;
}

const EditContentModal = ({ open, onOpenChange, type, item, onSave }: EditContentModalProps) => {
  const [title, setTitle] = useState(item?.title || '');
  const [genre, setGenre] = useState(item?.genre || '');
  const [description, setDescription] = useState(item?.description || '');
  const [saving, setSaving] = useState(false);

  // Sync state when item changes
  const [lastItemId, setLastItemId] = useState<string | null>(null);
  if (item && item.id !== lastItemId) {
    setTitle(item.title || '');
    setGenre(item.genre || '');
    setDescription(item.description || '');
    setLastItemId(item.id);
  }

  const handleSave = async () => {
    if (!item || !title.trim()) return;
    if (!isUploadGenre(genre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onSave(item.id, { title: title.trim(), genre, description: description.trim() });
      toast({ title: `${type === 'music' ? 'Track' : 'Video'} updated!` });
      onOpenChange(false);
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {type === 'music' ? 'Track' : 'Video'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          <label htmlFor="edit-content-genre" className="text-sm font-medium">Genre *</label>
          <GenreSelect id="edit-content-genre" value={genre} onValueChange={setGenre} disabled={saving} />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <Button className="rounded-full w-full" onClick={handleSave} disabled={saving || !title.trim() || !isUploadGenre(genre)}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditContentModal;
