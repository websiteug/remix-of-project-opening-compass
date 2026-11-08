import { describe, expect, test } from 'bun:test';
import { decideUpdate } from './updateCheck';

const base = { clientBuildId: 'old', mediaPlaying: false, tabHidden: false };

describe('decideUpdate', () => {
  test('same version on server: do nothing', () => {
    expect(decideUpdate({ ...base, serverBuildId: 'old' })).toBe('none');
  });

  test('server unreachable: do nothing', () => {
    expect(decideUpdate({ ...base, serverBuildId: null })).toBe('none');
  });

  test('new version and nothing playing: reload for everyone', () => {
    expect(decideUpdate({ ...base, serverBuildId: 'new' })).toBe('reload');
  });

  test('new version while a song plays on screen: wait for it to stop', () => {
    expect(decideUpdate({ ...base, serverBuildId: 'new', mediaPlaying: true })).toBe('wait');
  });

  test('new version while playing in a background tab: reload', () => {
    expect(
      decideUpdate({ ...base, serverBuildId: 'new', mediaPlaying: true, tabHidden: true }),
    ).toBe('reload');
  });

  test('song just finished: reload even though the next song already started', () => {
    expect(
      decideUpdate({
        ...base,
        serverBuildId: 'new',
        mediaPlaying: true,
        songJustEnded: true,
        waitedMs: 1_000,
      }),
    ).toBe('reload');
  });

  test('a reload that did not land is not repeated: ask the user instead', () => {
    expect(
      decideUpdate({
        ...base,
        serverBuildId: 'new',
        mediaPlaying: true,
        alreadyReloaded: true,
      }),
    ).toBe('wait');
  });

  test('waiting past the limit forces the update', () => {
    expect(
      decideUpdate({
        ...base,
        serverBuildId: 'new',
        mediaPlaying: true,
        waitedMs: 120_000,
        maxWaitMs: 120_000,
      }),
    ).toBe('reload');
  });

  test('waiting under the limit still spares the song', () => {
    expect(
      decideUpdate({
        ...base,
        serverBuildId: 'new',
        mediaPlaying: true,
        waitedMs: 119_999,
        maxWaitMs: 120_000,
      }),
    ).toBe('wait');
  });
});
