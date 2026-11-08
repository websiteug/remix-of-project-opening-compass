import { describe, expect, test } from 'bun:test';
import { genres, genreGroups, uploadGenres, isUploadGenre } from './constants';

describe('upload genre selection', () => {
  test('only catalogue genres can be selected, never All or typed values', () => {
    expect(uploadGenres).toEqual(genres.filter(genre => genre !== 'All'));
    expect(isUploadGenre('')).toBe(false);
    expect(isUploadGenre('All')).toBe(false);
    expect(isUploadGenre('My custom genre')).toBe(false);
    expect(isUploadGenre(undefined)).toBe(false);
  });

  test('selected values match the exact names used by music and video filters', () => {
    for (const genre of genres.filter(value => value !== 'All')) {
      expect(isUploadGenre(genre)).toBe(true);
      expect(uploadGenres.find(value => value === genre)).toBe(genre);
    }
    expect(isUploadGenre('gospel')).toBe(false);
  });
});

describe('Ugandan genre catalogue', () => {
  test('Ugandan modern and traditional genres are selectable for uploads', () => {
    for (const genre of ['Rumba', 'Kadongo Kamu', 'Kidandali', 'Bofena', 'Bax-Ragga', 'Lugaflow', 'Afropop', 'Afro Fusion', 'Afro House', 'Taarab', 'Zouk', 'Soukous', 'Bakisimba', 'Kadodi', 'Bwola', 'Larakaraka', 'Ekitaguriro', 'Ekizino', 'Embaire', 'Tamenaibuga', 'Agwara', 'Edonga', 'Runyege', 'Amakondere', 'Akogo']) {
      expect(isUploadGenre(genre)).toBe(true);
    }
  });

  test('the catalogue has no duplicates and every group member is uploadable', () => {
    expect(new Set(genres).size).toBe(genres.length);
    const grouped = genreGroups.flatMap(group => group.genres);
    expect(grouped.length).toBe(uploadGenres.length);
    for (const genre of grouped) {
      expect(isUploadGenre(genre)).toBe(true);
      expect(genres).toContain(genre);
    }
  });
});
