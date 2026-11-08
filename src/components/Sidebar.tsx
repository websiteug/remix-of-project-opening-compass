import { Link, useLocation } from '@/lib/router-compat';
import {
  Flame, Music, Video, Clock, ListMusic, Heart, MessageCircle, LayoutDashboard, Disc3, Shield, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { genres } from '@/lib/constants';
const mainLinks = [
  { to: '/', label: 'Explore', icon: Flame },
  { to: '/music', label: 'Music', icon: Music },
  { to: '/videos', label: 'Videos', icon: Video },
  
  { to: '/recently-added', label: 'Recently Added', icon: Clock },
  { to: '/playlist', label: 'Playlist', icon: ListMusic },
  { to: '/favourites', label: 'Favourite', icon: Heart },
  { to: '/guide', label: 'GUIDE', icon: MessageCircle },
];

const sidebarGenres = genres.filter(g => g !== 'All');

const Sidebar = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const { isAdmin } = useAdmin();
  const isArtist = profile?.role === 'artist';
  const genrePage = location.pathname === '/videos' || location.pathname.startsWith('/video/') ? '/videos' : '/music';
  return (
    <aside aria-label="Desktop sidebar" className="glass-sidebar fixed left-0 top-0 bottom-0 w-56 z-40 flex flex-col overflow-y-auto scrollbar-hide hidden md:flex border-r">
      <Link to="/" className="flex items-center gap-2 px-6 py-4 border-b border-sidebar-border">
        <img src="/logo.png" alt="LUO MUSIC STORE" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        <span className="brand-title min-w-0 text-[18px]">LUO MUSIC STORE</span>
      </Link>

      <div className="px-3 mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Menu</p>
        <nav className="flex flex-col gap-0.5">
          {mainLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to}
                className={`nav-link text-sm ${
                  isActive ? 'nav-link-active' : 'nav-link-inactive'
                }`}>
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Genre Section */}
      <div className="px-3 mt-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Genres</p>
          <Link to={genrePage} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">See All</Link>
        </div>
        <nav className="flex flex-col gap-0.5">
          {sidebarGenres.map(genre => (
            <Link key={genre} to={`${genrePage}?genre=${encodeURIComponent(genre)}`}
              className="nav-link nav-link-inactive py-1.5 text-xs">
              <Disc3 className="w-3.5 h-3.5" />
              {genre}
            </Link>
          ))}
        </nav>
      </div>

      {isArtist && (
        <div className="px-3 mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Artist</p>
          <nav className="flex flex-col gap-0.5">
            <Link to="/dashboard"
              className={`nav-link text-sm ${
                location.pathname === '/dashboard' ? 'nav-link-active' : 'nav-link-inactive'
              }`}>
              <LayoutDashboard className="w-4 h-4" />
              Artist Dashboard
            </Link>
          </nav>
        </div>
      )}

      {isAdmin && (
        <div className="px-3 mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Admin</p>
          <nav className="flex flex-col gap-0.5">
            <Link to="/artists"
              className={`nav-link text-sm ${
                location.pathname === '/artists' ? 'nav-link-active' : 'nav-link-inactive'
              }`}>
              <Users className="w-4 h-4" />
              Artists
            </Link>
            <Link to="/admin"
              className={`nav-link text-sm ${
                location.pathname.startsWith('/admin') ? 'nav-link-active' : 'nav-link-inactive'
              }`}>
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </nav>
        </div>
      )}

      <div className="h-4" />
    </aside>
  );
};

export default Sidebar;
