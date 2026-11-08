import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadGenres, isUploadGenre } from '@/lib/constants';

interface GenreSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export default function GenreSelect({ value, onValueChange, id, disabled }: GenreSelectProps) {
  return (
    <Select value={isUploadGenre(value) ? value : ''} onValueChange={onValueChange} disabled={disabled} required>
      <SelectTrigger id={id} aria-label="Genre">
        <SelectValue placeholder="Select Genre" />
      </SelectTrigger>
      <SelectContent>
        {uploadGenres.map(genre => (
          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}