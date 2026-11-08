import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallApp } from '@/hooks/useInstallApp';

const InstallAppBanner = () => {
  const { canInstall, install } = useInstallApp();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('install-banner-dismissed') === 'true');
  }, []);

  const hide = () => {
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', 'true');
  };

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[85] md:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            const accepted = await install();
            if (accepted) hide();
          }}
          className="glass-strong flex items-center gap-2 px-5 py-2.5 rounded-2xl text-foreground font-semibold text-sm active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
        <button
          onClick={hide}
          aria-label="Close"
          className="glass-strong w-10 h-10 rounded-2xl flex items-center justify-center text-foreground transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
