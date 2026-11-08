import { describe, expect, it } from 'vitest';
import { filterVideoGenre, videoGenreLink } from './videoGenres';

describe('video genre filtering', () => {
  const videos = [
    { id: 'legacy-upper', genre: 'DANCHALL' },
    { id: 'legacy-lower', genre: 'danchall' },
    { id: 'canonical', genre: 'Dancehall' },
    { id: 'spacing', genre: ' dancehall ' },
    { id: 'rumba', genre: 'Rumba' },
    { id: 'missing', genre: '' },
  ];
  it('Dancehall shows only Dancehall videos including existing legacy spellings', () => {
    expect(filterVideoGenre(videos, 'Dancehall').map(video => video.id)).toEqual(['legacy-upper', 'legacy-lower', 'canonical', 'spacing']);
  });
  it('All restores every video', () => {
    expect(filterVideoGenre(videos, 'All')).toEqual(videos);
  });
  it('other genres do not show Dancehall videos', () => {
    expect(filterVideoGenre(videos, 'Rumba').map(video => video.id)).toEqual(['rumba']);
  });
  it('Browse Dancehall links carry the canonical genre', () => {
    expect(videoGenreLink('DANCHALL')).toBe('/videos?genre=Dancehall');
  });
});