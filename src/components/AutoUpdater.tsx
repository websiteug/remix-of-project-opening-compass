import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { decideUpdate } from '@/lib/updateCheck';

const CHECK_EVERY_MS = 20_000;
const MAX_WAIT_MS = 120_000;
const TOAST_ID = 'site-update';
const RELOADED_KEY = 'luo_auto_update_reloaded';

function isMediaPlaying(): boolean {
  return Array.from(document.querySelectorAll('audio, video')).some((el) => {
    const m = el as HTMLMediaElement;
    return !m.paused && !m.ended && !m.muted;
  });
}

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/api/public/version?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return typeof data.buildId === 'string' ? data.buildId : null;
  } catch {
    return null;
  }
}

/**
 * Keeps every open tab on the newest published version: asks the server for its build id
 * every 20 seconds, and again whenever the tab comes back into view, the listener moves
 * to another page, or playback stops. When a new version is live the tab reloads — at the
 * end of the current song if one is playing, and no later than two minutes after the
 * update was first seen, so nobody is left on an old version. If one reload does not land,
 * the tab stops reloading and asks the listener to reopen the page instead.
 */
export default function AutoUpdater() {
  const reloading = useRef(false);
  const pendingSince = useRef<number | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const clientBuildId = __APP_BUILD_ID__;

    const readReloaded = () => {
      try {
        return sessionStorage.getItem(RELOADED_KEY) === '1';
      } catch {
        return false;
      }
    };
    const writeReloaded = () => {
      try {
        sessionStorage.setItem(RELOADED_KEY, '1');
      } catch {
        /* ignore */
      }
    };
    const clearReloaded = () => {
      try {
        sessionStorage.removeItem(RELOADED_KEY);
      } catch {
        /* ignore */
      }
    };

    let alreadyReloaded = readReloaded();

    const reload = () => {
      if (reloading.current) return;
      reloading.current = true;
      pendingSince.current = null;
      writeReloaded();
      toast.loading('Updating to the latest version…', { id: TOAST_ID });
      setTimeout(() => window.location.reload(), 600);
    };

    const check = async (songJustEnded = false) => {
      if (reloading.current) return;
      const serverBuildId = await fetchServerBuildId();

      if (!serverBuildId || serverBuildId === clientBuildId) {
        pendingSince.current = null;
        clearReloaded();
        alreadyReloaded = false;
        return;
      }
      if (pendingSince.current === null) pendingSince.current = Date.now();

      const decision = decideUpdate({
        clientBuildId,
        serverBuildId,
        mediaPlaying: isMediaPlaying(),
        tabHidden: document.visibilityState === 'hidden',
        songJustEnded,
        waitedMs: Date.now() - pendingSince.current,
        maxWaitMs: MAX_WAIT_MS,
        alreadyReloaded,
      });

      if (decision === 'reload') reload();
      if (decision === 'wait') {
        toast('A new version of the site is ready', {
          id: TOAST_ID,
          description: alreadyReloaded
            ? 'Close this page and open it again to get the latest version.'
            : 'It will update when your song ends, or in a couple of minutes.',
          duration: Infinity,
          action: { label: 'Update now', onClick: reload },
        });
      }
    };

    // Playback stopped: apply a waiting update straight away.
    const onMediaStop = () => {
      setTimeout(() => {
        if (!isMediaPlaying()) void check();
      }, 300);
    };

    // A song finishing is a natural moment to switch, even if the next one already started.
    const onSongEnd = () => {
      if (pendingSince.current !== null) void check(true);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    const interval = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    window.addEventListener('popstate', onVisible);
    document.addEventListener('pause', onMediaStop, true);
    document.addEventListener('ended', onSongEnd, true);
    void check();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('focus', onVisible);
      document.removeEventListener('online', onVisible);
      document.removeEventListener('popstate', onVisible);
      document.removeEventListener('pause', onMediaStop, true);
      document.removeEventListener('ended', onSongEnd, true);
    };
  }, []);

  return null;
}
