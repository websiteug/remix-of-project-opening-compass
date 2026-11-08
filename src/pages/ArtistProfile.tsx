import { siteOrigin } from '@/lib/siteUrl';
import { forwardRef, useRef, useState, useEffect } from 'react';
import { useParams, Link } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import { Play, Users, Music, Video, ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrackCard from '@/components/TrackCard';
import VideoCard from '@/components/VideoCard';
import JsonLd from '@/components/JsonLd';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO, getArtistJsonLd } from '@/hooks/useSEO';
import { fetchArtistById, fetchArtistTracks, fetchArtistVideos, checkFollowing, toggleFollow, updateArtistPhoto } from '@/lib/firebaseServices';
import type { Artist, Track, MusicVideo } from '@/lib/types';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { toast } from '@/hooks/use-toast';

const ArtistProfileInner = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'tracks' | 'videos' | 'about'>('tracks');
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [artistVideos, setArtistVideos] = useState<MusicVideo[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const isOwner = user?.uid === id;

  // Dynamic SEO for this artist - must be called before any early returns
  useSEO({
    title: artist ? `${artist.name} - ${artist.genre} Artist | LUO MUSIC STORE` : 'Artist | LUO MUSIC STORE',
    description: artist ? (artist.bio || `Listen to ${artist.name}'s music on LUO MUSIC STORE. ${artist.genre} artist with ${artistTracks.length} tracks and ${artistVideos.length} videos. Free music downloads, Luo music, Acholi music.`) : undefined,
    image: artist ? (artist as any).photoURL : undefined,
    url: `${siteOrigin()}/artist/${id}`,
    type: 'profile',
    keywords: artist ? [artist.name, artist.genre, 'artist', 'luo artist', 'acholi artist', 'african music'] : [],
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [a, t, v] = await Promise.all([
        fetchArtistById(id),
        fetchArtistTracks(id),
        fetchArtistVideos(id),
      ]);
      setArtist(a);
      setArtistTracks(t);
      setArtistVideos(v);
      if (user) {
        const isFollow = await checkFollowing(user.uid, id);
        setFollowing(isFollow);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleFollow = async () => {
    if (!user || !id) return;
    setFollowing(!following);
    await toggleFollow(user.uid, id, following);
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file || !user || !id || !isOwner) return;
    setUploadingPhoto(true);
    try {
      const url = await updateArtistPhoto(user.uid, file);
      setArtist(prev => prev ? { ...prev, photoURL: url } as any : prev);
      await refreshProfile();
      toast({ title: 'Profile picture updated!' });
    } catch {
      toast({ title: 'Failed to upload photo', variant: 'destructive' });
    }
    setUploadingPhoto(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!artist) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg mb-4">Artist not found</p>
        <Link to="/"><Button variant="outline" className="rounded-full border-border">Go Home</Button></Link>
      </div>
    );
  }

  // Generate JSON-LD structured data
  const artistJsonLd = getArtistJsonLd({
    ...artist,
    photoURL: (artist as any).photoURL,
  });

  const tabs = [
    { id: 'tracks' as const, label: 'Tracks', icon: Music, count: artistTracks.length },
    { id: 'videos' as const, label: 'Videos', icon: Video, count: artistVideos.length },
    { id: 'about' as const, label: 'About', icon: Users, count: null },
  ];

  return (
    <div>
      {/* Structured Data for SEO */}
      <JsonLd data={artistJsonLd} />
      
      <div className="relative h-72 md:h-80 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative container mx-auto px-4 h-full flex items-end pb-6">
          <Link to="/" className="absolute top-6 left-4 text-foreground/80 hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-5">
            <div className="relative group">
              {(artist as any).photoURL ? (
                <img src={getProxiedUrl((artist as any).photoURL)} alt={artist.name} className="w-28 h-28 md:w-36 md:h-36 rounded-full flex-shrink-0 border-4 border-background shadow-xl object-cover" loading="eager" decoding="async" />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full flex-shrink-0 border-4 border-background shadow-xl" style={{ background: `linear-gradient(135deg, ${artist.gradientFrom}, ${artist.gradientTo})` }} />
              )}
              {isOwner && (
                <>
                  <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0] || null)} />
                  <button
                    onClick={() => photoRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploadingPhoto ? (
                      <div className="w-6 h-6 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-background" />
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-bold font-heading">{artist.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{artist.followers} followers</span>
                <span>{artist.trackCount} tracks</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{artist.genre}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="rounded-full gap-1.5"><Play className="w-3.5 h-3.5" />Play All</Button>
                <Button variant={following ? 'default' : 'outline'} size="sm" className="rounded-full border-border" onClick={handleFollow}>
                  {following ? 'Following' : 'Follow'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex gap-1 border-b border-border mt-4 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.count !== null && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pb-12">
          {activeTab === 'tracks' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artistTracks.map(track => (<TrackCard key={track.id} track={track} />))}
              {artistTracks.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No tracks uploaded yet.</p>}
            </div>
          )}
          {activeTab === 'videos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {artistVideos.map(video => (<VideoCard key={video.id} video={video} />))}
              {artistVideos.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No videos uploaded yet.</p>}
            </div>
          )}
          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <h3 className="font-semibold font-heading text-lg mb-3">About {artist.name}</h3>
              <p className="text-muted-foreground leading-relaxed">{artist.bio}</p>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-card rounded-xl p-4 text-center"><p className="text-2xl font-bold font-heading text-primary">{artist.followers}</p><p className="text-xs text-muted-foreground mt-1">Followers</p></div>
                <div className="bg-card rounded-xl p-4 text-center"><p className="text-2xl font-bold font-heading text-primary">{artist.trackCount}</p><p className="text-xs text-muted-foreground mt-1">Tracks</p></div>
                <div className="bg-card rounded-xl p-4 text-center"><p className="text-2xl font-bold font-heading text-primary">{artistVideos.length}</p><p className="text-xs text-muted-foreground mt-1">Videos</p></div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const ArtistProfile = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}><ArtistProfileInner /></div>
));
ArtistProfile.displayName = 'ArtistProfile';

export default ArtistProfile;
