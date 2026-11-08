import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent | null;
  }
}

// One shared store so every "Download App" button uses the same real browser prompt.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let installedFlag = false;

if (typeof window !== 'undefined') {
  // The early script in __root may already have caught the event before React loaded.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__installPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('install-prompt-ready', notify);
  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    window.__installPrompt = null;
    notify();
    toast.success('LUO MUSIC STORE app installed');
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getPrompt = () => (typeof window === 'undefined' ? null : window.__installPrompt ?? null);
const getServerPrompt = () => null;

function detectIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function detectStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Real app install. On Android / Chrome / Edge / desktop it opens the browser's own
 * install window. On iPhone (no install window exists) it opens the iPhone share sheet,
 * where "Add to Home Screen" is one tap.
 */
export function useInstallApp() {
  const prompt = useSyncExternalStore(subscribe, getPrompt, getServerPrompt);
  const [env, setEnv] = useState({ ready: false, isIOS: false, standalone: false });

  useEffect(() => {
    setEnv({ ready: true, isIOS: detectIOS(), standalone: detectStandalone() });
  }, []);

  const isInstalled = env.standalone || installedFlag;
  const canInstall = env.ready && !isInstalled && (Boolean(prompt) || env.isIOS);

  const install = async () => {
    const p = window.__installPrompt;
    if (p) {
      await p.prompt();
      const { outcome } = await p.userChoice;
      window.__installPrompt = null;
      notify();
      return outcome === 'accepted';
    }
    if (env.isIOS && navigator.share) {
      toast('Tap "Add to Home Screen" to install', { duration: 6000 });
      try {
        await navigator.share({ title: 'LUO MUSIC STORE', url: window.location.origin + '/' });
      } catch {
        /* user closed the share sheet */
      }
    }
    return false;
  };

  return { canInstall, isInstalled, hasNativePrompt: Boolean(prompt), install };
}
