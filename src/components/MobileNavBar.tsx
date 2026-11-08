import { Link, useLocation } from '@/lib/router-compat';
import { Flame, Music, Video, Heart, ListMusic, LayoutDashboard, MoreHorizontal, Users, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { dashboardLinksFor } from '@/lib/dashboardLinks';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const primaryLinks = [
  { to: '/', label: 'Explore', icon: Flame },
  { to: '/music', label: 'Music', icon: Music },
  { to: '/videos', label: 'Videos', icon: Video },
];

const moreLinks = [
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/recently-added', label: 'Recent', icon: Flame },
  { to: '/playlist', label: 'Playlist', icon: ListMusic },
  { to: '/favourites', label: 'Favourite', icon: Heart },
  { to: '/guide', label: 'GUIDE', icon: MoreHorizontal },
];

const MobileNavBar = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const isArtist = Boolean(user) && profile?.role === 'artist';
  const [moreOpen, setMoreOpen] = useState(false);

  const dashboardLinks = dashboardLinksFor({ isArtist, isAdmin: Boolean(user) && isAdmin }).map(l => ({
    to: l.to,
    label: l.label,
    icon: l.kind === 'admin' ? Shield : LayoutDashboard,
  }));
  const allMore = [...dashboardLinks, ...moreLinks];

  const isLinkActive = (to: string) =>
    to === '/admin' ? location.pathname.startsWith('/admin') : location.pathname === to;
  const isMoreActive = allMore.some(l => isLinkActive(l.to));

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[90] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed bottom-[84px] left-3 right-3 z-[91] md:hidden rounded-3xl glass-strong p-3"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-4 gap-2">
                {allMore.map(link => {
                  const isActive = isLinkActive(link.to);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors"
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                      <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav dock */}
      <nav aria-label="Mobile navigation" className="liquid-dock fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[768px] z-[80] md:hidden">
        <div className="flex items-start justify-around px-2 pt-2.5 pb-1.5">
          {primaryLinks.map(link => {
            const isActive = location.pathname === link.to;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center gap-1 min-w-[56px]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isActive ? 'gradient-primary text-primary-foreground shadow-md' : 'glass text-foreground'}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                <span className={`text-[10px] leading-none ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="More navigation"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center gap-1 min-w-[56px]"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isMoreActive || moreOpen ? 'gradient-primary text-primary-foreground shadow-md' : 'glass text-foreground'}`}>
              <MoreHorizontal className="w-5 h-5" />
            </span>
            <span className={`text-[10px] leading-none ${isMoreActive || moreOpen ? 'text-primary font-semibold' : 'text-muted-foreground font-medium'}`}>
              More
            </span>
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
};

export default MobileNavBar;
