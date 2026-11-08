import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import TopBar from './TopBar';
import MobileNavBar from './MobileNavBar';
import InstallAppBanner from './InstallAppBanner';
import { usePlayer } from '@/contexts/PlayerContext';

const Layout = ({ children }: { children: ReactNode }) => {
  const { currentTrack } = usePlayer();

  return (
    <div className="min-h-screen">
      <Sidebar />

      {/* Main content */}
      <div className="md:ml-56">
        <div className={`px-4 md:px-6 ${currentTrack ? 'pb-44 md:pb-28' : 'pb-24 md:pb-6'}`}>
          <TopBar />
          {children}
        </div>
      </div>

      <PlayerBar />
      <InstallAppBanner />
      <MobileNavBar />
    </div>
  );
};

export default Layout;
