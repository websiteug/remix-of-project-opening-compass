import type { Track, MusicVideo } from '@/lib/types';

const KEY = 'luo_play_history_v1';
const MAX = 100;

export type HistoryEntry =
  | { kind: 'track'; id: string; playedAt: number; item: Track }
  | { kind: 'video'; id: string; playedAt: number; item: MusicVideo };

export function getPlayHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function add(entry: HistoryEntry) {
  if (typeof window === 'undefined') return;
  try {
    const list = getPlayHistory().filter(e => !(e.kind === entry.kind && e.id === entry.id));
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}

export const recordTrackPlay = (t: Track) => t?.id && add({ kind: 'track', id: t.id, playedAt: Date.now(), item: t });
export const recordVideoPlay = (v: MusicVideo) => v?.id && add({ kind: 'video', id: v.id, playedAt: Date.now(), item: v });
export const clearPlayHistory = () => typeof window !== 'undefined' && localStorage.removeItem(KEY);
