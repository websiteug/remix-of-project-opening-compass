import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, LinkIcon } from 'lucide-react';
import type { HeroSlide } from '@/lib/firebaseServices';
import type { Track, MusicVideo } from '@/lib/types';

interface EditHeroSlideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slide: HeroSlide | null;
  tracksForLink: Track[];
  videosForLink: MusicVideo[];
  onSave: (id: string, data: {
    title?: string;
    subtitle?: string;
    badge?: string;
    ctaText?: string;
    linkedContentId?: string;
    linkedContentType?: 'track' | 'video' | '';
    imageFile?: File;
  }) => Promise<void>;
}

const EditHeroSlideModal = ({ open, onOpenChange, slide, tracksForLink, videosForLink, onSave }: EditHeroSlideModalProps) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [linkType, setLinkType] = useState<'track' | 'video' | ''>('');
  const [linkId, setLinkId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slide) {
      setTitle(slide.title || '');
      setSubtitle(slide.subtitle || '');
      setBadge(slide.badge || '');
      setCtaText(slide.ctaText || 'Listen Now');
      setLinkType(slide.linkedContentType || '');
      setLinkId(slide.linkedContentId || '');
      setImageFile(null);
    }
  }, [slide]);

  const handleSave = async () => {
    if (!slide) return;
    setSaving(true);
    await onSave(slide.id, {
      title,
      subtitle,
      badge,
      ctaText,
      linkedContentId: linkId,
      linkedContentType: linkType,
      imageFile: imageFile || undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Hero Slide</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Slide Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          <Input placeholder="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} maxLength={150} />
          <Input placeholder="Badge (e.g. Featured)" value={badge} onChange={e => setBadge(e.target.value)} maxLength={50} />
          <Input placeholder="CTA Text" value={ctaText} onChange={e => setCtaText(e.target.value)} maxLength={30} />

          <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
            <p className="text-xs font-medium flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Link to Content</p>
            <Select value={linkType} onValueChange={(v: 'track' | 'video' | '') => { setLinkType(v); setLinkId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select content type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="track">Music Track</SelectItem>
                <SelectItem value="video">Music Video</SelectItem>
              </SelectContent>
            </Select>
            {linkType === 'track' && (
              <Select value={linkId} onValueChange={setLinkId}>
                <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                <SelectContent>
                  {tracksForLink.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {linkType === 'video' && (
              <Select value={linkId} onValueChange={setLinkId}>
                <SelectTrigger><SelectValue placeholder="Select a video" /></SelectTrigger>
                <SelectContent>
                  {videosForLink.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <input type="file" accept="image/*" ref={imageRef} className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          <div onClick={() => imageRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{imageFile ? imageFile.name : 'Change cover image (optional)'}</p>
          </div>

          <Button className="rounded-full w-full" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditHeroSlideModal;
