import { useState } from 'react';
import { useInstallApp } from '@/hooks/useInstallApp';
import { Search, Download, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthModal from './AuthModal';
import SearchModal from './SearchModal';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from '@/lib/router-compat';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { useIsMobile } from '@/hooks/use-mobile';

const headerLinks = [
  { to: '/genres', label: 'Genres' },
  { to: '/music', label: 'Music' },
  { to: '/videos', label: 'Videos' },
  { to: '/recently-added', label: 'Recent' },
  { to: '/artists', label: 'Artists' },
  { to: '/guide', label: 'Guide' },
];

const TopBar = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { canInstall, install } = useInstallApp();
  const { user, profile, logOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleInstall = () => {
    void install();
  };

  return (
    <>
      <header className="glass-header sticky top-0 md:top-3 z-30 mb-4 -mx-4 md:mx-0 md:mt-3 px-3 py-1.5 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-1.5 md:gap-2">
            <img src="/logo.png" alt="LUO MUSIC STORE" className="h-9 w-9 shrink-0 rounded-full object-contain" />
            <span className="brand-title text-[17px] md:text-[20px]">LUO MUSIC<span className="hidden md:inline"> STORE</span></span>
          </Link>

          {/* Mobile search pill */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search music"
            className="glass md:hidden ml-auto flex h-9 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-input px-3 text-sm text-muted-foreground"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search</span>
          </button>

          <div className="ml-0 md:ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
          {canInstall && (
            <Button variant="glass" size="sm"
              onClick={handleInstall}
              aria-label="Download App"
              title="Download App"
              className="hidden md:inline-flex rounded-lg text-xs"
            >
              <Download className="download-icon w-3.5 h-3.5" strokeWidth={2.75} />
              Download App
            </Button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(isMobile ? '/profile' : (profile?.role === 'artist' ? '/dashboard' : '/favourites'))}
              >
                {profile?.photoURL ? (
                  <img
                    src={getProxiedUrl(profile.photoURL)}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                    style={{ background: profile?.gradientFrom ? `linear-gradient(135deg, ${profile.gradientFrom}, ${profile.gradientTo})` : 'hsl(var(--primary))' }}>
                    {(profile?.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
              </button>
              {!isMobile && (
                <Button variant="ghost" size="icon" className="rounded-full" onClick={logOut}>
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ) : (
            <Button variant="login" size="sm"
              onClick={() => setAuthOpen(true)}
              aria-label="Sign In"
              className="h-9 w-9 px-0 md:w-auto md:px-3 rounded-lg"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden md:inline">Sign In</span>
            </Button>
          )}
          </div>
        </div>

        {/* Desktop search field */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search music"
          className="glass hidden md:flex mt-3 h-12 w-full items-center gap-2 rounded-2xl border border-input px-4 text-sm text-muted-foreground text-left"
        >
          <Search className="h-4 w-4 shrink-0" />
          Search songs, artists and videos
        </button>

        <nav aria-label="Quick links" className="mt-3 hidden flex-wrap items-center gap-1 md:flex">
          {headerLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-2 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-glass-strong hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default TopBar;
