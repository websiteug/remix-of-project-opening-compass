import { uploadGenres } from './constants';

// Preserve existing records while matching legacy spellings to the shared catalogue.
export function videoGenre(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? '';
  const aliases: Record<string, string> = { danchall: 'Dancehall', gosple: 'Gospel', rnd: 'RnB' };
  return aliases[normalized] ?? uploadGenres.find(genre => genre.toLowerCase() === normalized) ?? value?.trim() ?? '';
}

export function filterVideoGenre<T extends { genre?: string }>(videos: T[], genre: string): T[] {
  if (!genre || genre === 'All') return videos;
  const selected = videoGenre(genre);
  return videos.filter(video => videoGenre(video.genre) === selected);
}

export function videoGenreLink(genre: string): string {
  return `/videos?genre=${encodeURIComponent(videoGenre(genre))}`;
}