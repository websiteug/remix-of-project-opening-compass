import { useState, useEffect, useRef } from 'react';
import { Upload, Music, Video, User, BarChart3, FileAudio, FileVideo, Image, Trash2, Edit, Film, Camera, Star, StarOff, Link as LinkIcon, Crown, Clock, Calendar } from 'lucide-react';
import UploadProgressBar from '@/components/UploadProgressBar';
import { isGoogleDriveUrl, isValidMediaLink } from '@/lib/googleDrive';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  uploadTrack, uploadVideo, fetchArtistTracks, fetchArtistVideos, deleteTrack, deleteVideo,
  fetchHeroSlides, addHeroSlide, deleteHeroSlide, updateHeroSlide, type HeroSlide,
  createReel, updateArtistPhoto, toggleRecentlyAdded, updateTrack, updateVideo,
  fetchTracks, fetchVideos,
} from '@/lib/firebaseServices';
import type { Track, MusicVideo } from '@/lib/types';
import { genres, DEFAULT_COVER_URL, isUploadGenre } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { getProxiedUrl } from '@/lib/mediaProxy';
import EditContentModal from '@/components/EditContentModal';
import EditHeroSlideModal from '@/components/EditHeroSlideModal';
import StorageManagement from '@/components/StorageManagement';
import SubscriptionModal from '@/components/SubscriptionModal';
import SubscriptionGate from '@/components/SubscriptionGate';
import HeroSlidePaymentModal from '@/components/HeroSlidePaymentModal';
import { fetchArtistSubscription, canUpload, addStorageUsage, type ArtistSubscription } from '@/lib/subscriptionService';
import { getHeroSlideDaysRemaining, HERO_SLIDE_PLANS, formatUGX } from '@/lib/heroSlideService';

import GenreSelect from '@/components/GenreSelect';

const uploadGenres = genres.filter(g => g !== 'All');

type Tab = 'overview' | 'upload-music' | 'upload-video' | 'hero-slides' | 'manage' | 'profile' | 'subscription';

const ArtistDashboard = () => {
  const { user, profile, updateUserProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [subscription, setSubscription] = useState<ArtistSubscription | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);

  // Upload forms
  const [trackTitle, setTrackTitle] = useState('');
  const [trackGenre, setTrackGenre] = useState('');
  const [trackDesc, setTrackDesc] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [trackSource, setTrackSource] = useState<'file' | 'link'>('file');
  const [trackLink, setTrackLink] = useState('');
  const [trackCoverFile, setTrackCoverFile] = useState<File | null>(null);
  const [trackCoverPreview, setTrackCoverPreview] = useState<string | null>(null);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoGenre, setVideoGenre] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSource, setVideoSource] = useState<'file' | 'link'>('file');
  const [videoLink, setVideoLink] = useState('');
  const [videoCoverFile, setVideoCoverFile] = useState<File | null>(null);
  const [videoCoverPreview, setVideoCoverPreview] = useState<string | null>(null);

  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideBadge, setSlideBadge] = useState('');
  const [slideImage, setSlideImage] = useState<File | null>(null);
  const [slideLinkType, setSlideLinkType] = useState<'track' | 'video' | ''>('');
  const [slideLinkId, setSlideLinkId] = useState('');
  const [slideCTA, setSlideCTA] = useState('Listen Now');
  const [allTracksForLink, setAllTracksForLink] = useState<Track[]>([]);
  const [allVideosForLink, setAllVideosForLink] = useState<MusicVideo[]>([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'music' | 'video'>('all');

  // Reel form
  const [reelCaption, setReelCaption] = useState('');
  const [reelAudioTitle, setReelAudioTitle] = useState('');
  const [reelVideoFile, setReelVideoFile] = useState<File | null>(null);

  // Profile
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileGenre, setProfileGenre] = useState('');
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<'music' | 'video'>('music');
  const [editItem, setEditItem] = useState<{ id: string; title: string; genre?: string; description?: string } | null>(null);

  // Edit hero slide modal
  const [editSlideOpen, setEditSlideOpen] = useState(false);
  const [editSlide, setEditSlide] = useState<HeroSlide | null>(null);

  // Hero slide payment modal
  const [heroPaymentOpen, setHeroPaymentOpen] = useState(false);
  const [pendingSlideData, setPendingSlideData] = useState<{
    title: string;
    subtitle?: string;
    artist: string;
    artistId: string;
    badge: string;
    imageFile?: File;
    linkedContentId?: string;
    linkedContentType?: 'track' | 'video';
    ctaText?: string;
  } | null>(null);

  const audioRef = useRef<HTMLInputElement>(null);
  const trackCoverRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const videoCoverRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const slideFormRef = useRef<HTMLDivElement>(null);
  const [selectedHeroPlan, setSelectedHeroPlan] = useState<string>('');
  const reelVideoRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  const artistId = user?.uid || '';
  const artistName = profile?.artistName || profile?.name || '';

  useEffect(() => {
    if (!user) return;
    loadData();
    setProfileName(profile?.artistName || profile?.name || '');
    setProfileBio(profile?.bio || '');
    setProfilePhone(profile?.phone || '');
    setProfileAddress(profile?.address || '');
    setProfileGenre(profile?.genre || '');
    setProfilePhotoPreview(profile?.photoURL ? getProxiedUrl(profile.photoURL) : null);
  }, [user, profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, v, h, sub] = await Promise.all([
        fetchArtistTracks(artistId),
        fetchArtistVideos(artistId),
        fetchHeroSlides(),
        fetchArtistSubscription(artistId),
      ]);
      setTracks(t);
      setVideos(v);
      setHeroSlides(h);
      setSubscription(sub);
      console.log('[Dashboard] Subscription state:', sub?.status, sub?.planId);
    } catch (err) {
      console.error('[Dashboard] loadData error:', err);
    }
    setLoading(false);
  };

  // Reminder: artist with active subscription should fill their storage within the month
  useEffect(() => {
    if (!subscription || subscription.status !== 'active' || !artistId) return;

    const REMINDER_KEY = `sub-reminder-${artistId}-${subscription.planId}`;
    const lastShown = localStorage.getItem(REMINDER_KEY);
    const today = new Date().toDateString();
    if (lastShown === today) return;

    const limitBytes = (subscription.storageGB || 0) * 1024 * 1024 * 1024;
    const usedBytes = subscription.storageUsedBytes || 0;
    const remainingBytes = Math.max(0, limitBytes - usedBytes);
    const usagePercent = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;

    let expiresDate: Date | null = null;
    const ex: any = subscription.expiresAt;
    if (ex?.toDate) expiresDate = ex.toDate();
    else if (ex?.seconds) expiresDate = new Date(ex.seconds * 1000);
    else if (ex) expiresDate = new Date(ex);

    const daysRemaining = expiresDate
      ? Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;

    const remainingGB = (remainingBytes / (1024 * 1024 * 1024)).toFixed(2);

    const timer = setTimeout(() => {
      if (daysRemaining <= 5) {
        toast({
          title: '⚠️ Subscription expiring soon',
          description: `Your storage plan expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew to keep uploading.`,
          duration: 9000,
        });
        localStorage.setItem(REMINDER_KEY, today);
      } else if (usagePercent < 80) {
        toast({
          title: '⏳ Use your storage before it expires',
          description: `You still have ${remainingGB} GB unused. Your ${subscription.storageGB} GB plan expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — upload your music & videos to make the most of it!`,
          duration: 9000,
        });
        localStorage.setItem(REMINDER_KEY, today);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [subscription, artistId]);

  // Load only artist's own content for hero slide linking
  useEffect(() => {
    if (activeTab === 'hero-slides' && artistId) {
      Promise.all([fetchArtistTracks(artistId), fetchArtistVideos(artistId)]).then(([t, v]) => {
        setAllTracksForLink(t);
        setAllVideosForLink(v);
      });
    }
  }, [activeTab, artistId]);

  const handleTrackCoverSelect = (file: File | null) => {
    setTrackCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setTrackCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setTrackCoverPreview(null);
    }
  };

  const handleVideoCoverSelect = (file: File | null) => {
    setVideoCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setVideoCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setVideoCoverPreview(null);
    }
  };

  function extractThumbnailFromVideo(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to extract thumbnail'));
          }
        }, 'image/jpeg', 0.85);
      };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load error')); };
    });
  }

  const [autoVideoThumb, setAutoVideoThumb] = useState(false);

  const handleVideoFileSelect = async (file: File | null) => {
    setVideoFile(file);
    if (file) {
      try {
        const thumbFile = await extractThumbnailFromVideo(file);
        setVideoCoverFile(thumbFile);
        setVideoCoverPreview(URL.createObjectURL(thumbFile));
        setAutoVideoThumb(true);
      } catch {
        console.warn('Could not auto-extract thumbnail');
        setAutoVideoThumb(false);
      }
    } else {
      setAutoVideoThumb(false);
    }
  };

  const handleProfilePhotoSelect = async (file: File | null) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await updateArtistPhoto(user.uid, file);
      setProfilePhotoPreview(getProxiedUrl(url));
      await refreshProfile();
      toast({ title: 'Profile picture updated!' });
    } catch {
      toast({ title: 'Failed to upload photo', variant: 'destructive' });
    }
    setUploading(false);
  };

  const checkSubscriptionBeforeUpload = async (file: File | null | undefined): Promise<boolean> => {
    const fileSize = file?.size || 0;
    const check = await canUpload(artistId, fileSize);
    if (!check.allowed) {
      toast({ title: 'Upload Blocked', description: check.reason, variant: 'destructive' });
      setSubModalOpen(true);
      return false;
    }
    return true;
  };

  const handleUploadTrack = async () => {
    if (!trackTitle.trim()) return;
    if (!isUploadGenre(trackGenre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    if (trackSource === 'link' && !isValidMediaLink(trackLink)) {
      toast({ title: 'Invalid link', description: 'Paste a valid https link (Google Drive share links supported).', variant: 'destructive' });
      return;
    }
    if (trackSource === 'file' && !(await checkSubscriptionBeforeUpload(audioFile))) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadLabel('Uploading track...');
    try {
      await uploadTrack({
        title: trackTitle, genre: trackGenre, description: trackDesc,
        artistId, artistName,
        audioFile: trackSource === 'file' ? audioFile || undefined : undefined,
        audioUrl: trackSource === 'link' ? trackLink.trim() : undefined,
        coverFile: trackCoverFile || undefined,
        onProgress: (p) => setUploadProgress(p),
      });
      // Track storage usage
      const totalSize = (trackSource === 'file' ? audioFile?.size || 0 : 0) + (trackCoverFile?.size || 0);
      if (totalSize > 0) await addStorageUsage(artistId, totalSize);
      toast({ title: 'Track uploaded!' });
      setTrackTitle(''); setTrackGenre(''); setTrackDesc(''); setAudioFile(null); setTrackLink('');
      setTrackCoverFile(null); setTrackCoverPreview(null);
      await loadData();
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    setUploading(false);
    setUploadProgress(0);
    setUploadLabel('');
  };

  const handleUploadVideo = async () => {
    if (!videoTitle.trim()) return;
    if (!isUploadGenre(videoGenre)) {
      toast({ title: 'Select a genre', variant: 'destructive' });
      return;
    }
    if (videoSource === 'link' && !isValidMediaLink(videoLink)) {
      toast({ title: 'Invalid link', description: 'Paste a valid https link (Google Drive share links supported).', variant: 'destructive' });
      return;
    }
    if (videoSource === 'file' && !(await checkSubscriptionBeforeUpload(videoFile))) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadLabel('Uploading video...');
    try {
      await uploadVideo({
        title: videoTitle, genre: videoGenre, description: videoDesc,
        artistId, artistName,
        videoFile: videoSource === 'file' ? videoFile || undefined : undefined,
        videoUrl: videoSource === 'link' ? videoLink.trim() : undefined,
        thumbnailFile: videoCoverFile || undefined,
        onProgress: (p) => setUploadProgress(p),
      });
      const totalSize = (videoSource === 'file' ? videoFile?.size || 0 : 0) + (videoCoverFile?.size || 0);
      if (totalSize > 0) await addStorageUsage(artistId, totalSize);
      toast({ title: 'Video uploaded!' });
      setVideoTitle(''); setVideoGenre(''); setVideoDesc(''); setVideoFile(null); setVideoLink('');
      setVideoCoverFile(null); setVideoCoverPreview(null); setAutoVideoThumb(false);
      await loadData();
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    setUploading(false);
    setUploadProgress(0);
    setUploadLabel('');
  };

  const handleUploadReel = async () => {
    if (!reelCaption.trim()) return;
    if (!(await checkSubscriptionBeforeUpload(reelVideoFile))) return;
    setUploading(true);
    try {
      await createReel({
        artistId, artistName,
        caption: reelCaption,
        audioTitle: reelAudioTitle || 'Original Audio',
        videoFile: reelVideoFile || undefined,
      });
      const totalSize = reelVideoFile?.size || 0;
      if (totalSize > 0) await addStorageUsage(artistId, totalSize);
      toast({ title: 'Reel uploaded!' });
      setReelCaption(''); setReelAudioTitle(''); setReelVideoFile(null);
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }); }
    setUploading(false);
  };

  const handleAddSlide = async () => {
    if (!slideTitle.trim()) return;
    
    // Store slide data and show payment modal (payment first, then upload)
    setPendingSlideData({
      title: slideTitle,
      subtitle: slideSubtitle || undefined,
      artist: artistName,
      artistId: artistId,
      badge: slideBadge || 'New',
      imageFile: slideImage || undefined,
      linkedContentId: slideLinkId || undefined,
      linkedContentType: slideLinkType || undefined,
      ctaText: slideCTA || 'Listen Now',
    });
    setHeroPaymentOpen(true);
  };

  const handleHeroPaymentSuccess = async () => {
    // Clear form after successful payment
    setSlideTitle(''); setSlideSubtitle(''); setSlideBadge(''); setSlideImage(null);
    setSlideLinkType(''); setSlideLinkId(''); setSlideCTA('Listen Now');
    setPendingSlideData(null);
    await loadData();
    toast({ title: 'Hero slide is now live!', description: 'Your slide will be automatically removed when it expires.' });
  };

  const handleDeleteTrack = async (id: string) => { await deleteTrack(id); await loadData(); toast({ title: 'Track deleted' }); };
  const handleDeleteVideo = async (id: string) => { await deleteVideo(id); await loadData(); toast({ title: 'Video deleted' }); };
  const handleDeleteSlide = async (id: string) => { await deleteHeroSlide(id); await loadData(); toast({ title: 'Slide deleted' }); };

  const handleEditSlide = (slide: HeroSlide) => {
    setEditSlide(slide);
    setEditSlideOpen(true);
  };

  const handleSaveSlide = async (id: string, data: any) => {
    await updateHeroSlide(id, data);
    await loadData();
    toast({ title: 'Hero slide updated!' });
  };

  const handleToggleRecent = async (type: 'tracks' | 'videos', id: string, isRecent: boolean) => {
    await toggleRecentlyAdded(type, id, isRecent);
    await loadData();
    toast({ title: isRecent ? 'Removed from recently added' : 'Marked as recently added' });
  };

  const handleEditItem = (type: 'music' | 'video', item: any) => {
    setEditType(type);
    setEditItem({ id: item.id, title: item.title, genre: item.genre, description: item.description });
    setEditOpen(true);
  };

  const handleSaveEdit = async (id: string, data: { title: string; genre: string; description: string }) => {
    if (editType === 'music') {
      await updateTrack(id, data);
    } else {
      await updateVideo(id, data);
    }
    await loadData();
  };

  const handleSaveProfile = async () => {
    setUploading(true);
    await updateUserProfile({ artistName: profileName, name: profileName, bio: profileBio, phone: profilePhone, address: profileAddress, genre: profileGenre });
    toast({ title: 'Profile updated!' });
    setUploading(false);
  };

  if (!user || profile?.role !== 'artist') {
    return <div className="py-20 text-center"><p className="text-muted-foreground">Sign in as an artist to access the dashboard.</p></div>;
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'subscription' as Tab, label: 'Storage', icon: Crown },
    { id: 'upload-music' as Tab, label: 'Upload Music', icon: FileAudio },
    { id: 'upload-video' as Tab, label: 'Upload Video', icon: FileVideo },
    
    { id: 'hero-slides' as Tab, label: 'Hero Slides', icon: Image },
    { id: 'manage' as Tab, label: 'Manage Content', icon: Edit },
    { id: 'profile' as Tab, label: 'Profile', icon: User },
  ];

  const allContent = [
    ...tracks.map(t => ({ ...t, type: 'music' as const })),
    ...videos.map(v => ({ ...v, type: 'video' as const })),
  ];
  const filteredContent = contentFilter === 'all' ? allContent : allContent.filter(c => c.type === contentFilter);

  return (
    <div className="pb-8">
      <h1 className="text-2xl font-bold font-heading mb-1">Artist Dashboard</h1>
      <p className="text-muted-foreground text-sm mb-6">Manage your music, videos, and profile</p>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[{ label: 'Total Tracks', value: tracks.length, icon: Music }, { label: 'Total Videos', value: videos.length, icon: Video }, { label: 'Total Plays', value: tracks.reduce((s, t) => s + parseInt(t.plays?.replace(/[^0-9]/g, '') || '0'), 0), icon: BarChart3 }, { label: 'Hero Slides', value: heroSlides.length, icon: Image }].map(stat => (
              <div key={stat.label} className="bg-card rounded-xl p-4">
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-bold font-heading">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          <h2 className="text-lg font-bold font-heading mb-3">Your Recent Uploads</h2>
          <div className="bg-card rounded-xl divide-y divide-border">
            {tracks.slice(0, 5).map(track => (
              <div key={track.id} className="flex items-center gap-3 p-3">
                {track.coverURL ? (
                  <img src={getProxiedUrl(track.coverURL)} alt={track.title} className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${track.gradientFrom}, ${track.gradientTo})` }} />
                )}
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{track.title}</p><p className="text-xs text-muted-foreground">{track.plays} plays</p></div>
                <span className="text-xs text-muted-foreground">{track.duration}</span>
              </div>
            ))}
            {tracks.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No uploads yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'upload-music' && (
        <SubscriptionGate subscription={subscription} onSubscribe={() => setSubModalOpen(true)} onRefresh={loadData}>
        <div className="max-w-lg">
          <div className="flex gap-2 mb-4">
            <Button type="button" variant={trackSource === 'file' ? 'default' : 'outline'} size="sm" className="rounded-full flex-1" onClick={() => setTrackSource('file')}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />Upload file
            </Button>
            <Button type="button" variant={trackSource === 'link' ? 'default' : 'outline'} size="sm" className="rounded-full flex-1" onClick={() => setTrackSource('link')}>
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" />Use a link
            </Button>
          </div>

          {trackSource === 'file' ? (
            <>
              <input type="file" accept="audio/*" ref={audioRef} className="hidden" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
              <div onClick={() => audioRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">{audioFile ? audioFile.name : 'Drop your audio file here'}</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, FLAC up to 50MB</p>
              </div>
            </>
          ) : (
            <div className="border border-border rounded-xl p-4 mb-4 space-y-2">
              <Input placeholder="https://drive.google.com/file/d/.../view" value={trackLink} onChange={e => setTrackLink(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Paste a direct audio link or a Google Drive share link (set to "Anyone with the link").
                {isGoogleDriveUrl(trackLink) && ' Google Drive detected - it will play in Drive\'s own player.'}
              </p>
            </div>
          )}

          <div className="border border-border rounded-xl p-3 flex items-center gap-3 mb-6">
            <img src={DEFAULT_COVER_URL} alt="Default cover" className="w-14 h-14 rounded-lg object-cover" />
            <p className="text-xs text-muted-foreground">Default cover image will be used for all tracks</p>
          </div>

          <div className="space-y-3">
            <Input placeholder="Track Title" value={trackTitle} onChange={e => setTrackTitle(e.target.value)} maxLength={100} />
            <label htmlFor="upload-track-genre" className="text-sm font-medium">Genre *</label>
            <GenreSelect id="upload-track-genre" value={trackGenre} onValueChange={setTrackGenre} disabled={uploading} />
            <textarea placeholder="Description (optional)" value={trackDesc} onChange={e => setTrackDesc(e.target.value)} maxLength={500} rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            {uploading && uploadLabel.includes('track') && (
              <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
            )}
            <Button className="rounded-full w-full" onClick={handleUploadTrack} disabled={uploading || !isUploadGenre(trackGenre) || !trackTitle.trim() || (trackSource === 'link' && !trackLink.trim())}>
              {uploading && uploadLabel.includes('track') ? `Uploading... ${uploadProgress}%` : 'Upload Track'}
            </Button>
          </div>
        </div>
        </SubscriptionGate>
      )}

      {activeTab === 'upload-video' && (
        <SubscriptionGate subscription={subscription} onSubscribe={() => setSubModalOpen(true)} onRefresh={loadData}>
        <div className="max-w-lg">
          <div className="flex gap-2 mb-4">
            <Button type="button" variant={videoSource === 'file' ? 'default' : 'outline'} size="sm" className="rounded-full flex-1" onClick={() => setVideoSource('file')}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />Upload file
            </Button>
            <Button type="button" variant={videoSource === 'link' ? 'default' : 'outline'} size="sm" className="rounded-full flex-1" onClick={() => setVideoSource('link')}>
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" />Use a link
            </Button>
          </div>

          {videoSource === 'file' ? (
            <>
              <input type="file" accept="video/*" ref={videoRef} className="hidden" onChange={e => handleVideoFileSelect(e.target.files?.[0] || null)} />
              <div onClick={() => videoRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">{videoFile ? videoFile.name : 'Drop your video file here'}</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, MOV up to 500MB</p>
              </div>
            </>
          ) : (
            <div className="border border-border rounded-xl p-4 mb-4 space-y-2">
              <Input placeholder="https://drive.google.com/file/d/.../view" value={videoLink} onChange={e => setVideoLink(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Paste a direct video link or a Google Drive share link (set to "Anyone with the link").
                {isGoogleDriveUrl(videoLink) && ' Google Drive detected - it will play in Drive\'s own player.'}
              </p>
            </div>
          )}

          <div className="border border-border rounded-xl p-3 flex items-center gap-3 mb-6">
            <img src={DEFAULT_COVER_URL} alt="Default thumbnail" className="w-14 h-14 rounded-lg object-cover" />
            <p className="text-xs text-muted-foreground">Default thumbnail will be used for all videos</p>
          </div>

          <div className="space-y-3">
            <Input placeholder="Video Title" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} maxLength={100} />
            <label htmlFor="upload-video-genre" className="text-sm font-medium">Genre *</label>
            <GenreSelect id="upload-video-genre" value={videoGenre} onValueChange={setVideoGenre} disabled={uploading} />
            <textarea placeholder="Description (optional)" value={videoDesc} onChange={e => setVideoDesc(e.target.value)} maxLength={500} rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            {uploading && uploadLabel.includes('video') && (
              <UploadProgressBar progress={uploadProgress} label={uploadLabel} />
            )}
            <Button className="rounded-full w-full" onClick={handleUploadVideo} disabled={uploading || !isUploadGenre(videoGenre) || !videoTitle.trim() || (videoSource === 'link' && !videoLink.trim())}>
              {uploading && uploadLabel.includes('video') ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
            </Button>
          </div>
        </div>
        </SubscriptionGate>
      )}


      {activeTab === 'hero-slides' && (
        <div className="max-w-2xl">
          {/* Pricing info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-primary" /> Hero Slide Pricing
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {HERO_SLIDE_PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedHeroPlan(plan.id);
                    setTimeout(() => slideFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                  }}
                  className={`bg-background/50 rounded-lg p-3 text-center transition-all border-2 ${
                    selectedHeroPlan === plan.id
                      ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                      : 'border-transparent hover:border-primary/20'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold">{plan.name}</p>
                  <p className="text-xs text-primary font-bold">{formatUGX(plan.priceUGX)}</p>
                  <p className="text-[10px] text-muted-foreground">per slide</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Hero slides are automatically removed when they expire.
            </p>
          </div>

          <p className="text-sm text-muted-foreground mb-4">Your hero slides on the homepage.</p>
          
          {/* Only show artist's own slides */}
          <div className="space-y-3 mb-6">
            {heroSlides.filter(s => s.artistId === artistId && s.status === 'active').map(slide => {
              const daysLeft = getHeroSlideDaysRemaining(slide);
              
              return (
                <div key={slide.id} className="flex items-center gap-3 bg-card rounded-xl p-3">
                  <div className="w-16 h-10 rounded-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, hsl(${slide.gradientFrom}), hsl(${slide.gradientTo}))` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{slide.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{slide.badge}</span>
                      {slide.linkedContentId && <span className="text-xs text-primary">• Linked</span>}
                      {daysLeft > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {daysLeft}d left
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEditSlide(slide)}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => handleDeleteSlide(slide.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {heroSlides.filter(s => s.artistId === artistId && s.status === 'active').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No active hero slides yet. Create and pay for one below!</p>
            )}
          </div>
          
          
          <div ref={slideFormRef}>
          <h3 className="text-sm font-bold font-heading mb-3">Add New Slide</h3>
          {selectedHeroPlan && (
            <p className="text-xs text-primary font-medium mb-3">
              Selected plan: {HERO_SLIDE_PLANS.find(p => p.id === selectedHeroPlan)?.name} — {formatUGX(HERO_SLIDE_PLANS.find(p => p.id === selectedHeroPlan)?.priceUGX || 0)}
            </p>
          )}
          <div className="space-y-3">
            <Input placeholder="Slide Title" value={slideTitle} onChange={e => setSlideTitle(e.target.value)} maxLength={100} />
            <Input placeholder="Subtitle (e.g. A new hit single)" value={slideSubtitle} onChange={e => setSlideSubtitle(e.target.value)} maxLength={150} />

            {/* Link to content */}
            <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs font-medium flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Link to Content</p>
              <Select value={slideLinkType} onValueChange={(v: 'track' | 'video' | '') => { setSlideLinkType(v); setSlideLinkId(''); }}>
                <SelectTrigger><SelectValue placeholder="Select content type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="track">Music Track</SelectItem>
                  <SelectItem value="video">Music Video</SelectItem>
                </SelectContent>
              </Select>
              {slideLinkType === 'track' && (
                <Select value={slideLinkId} onValueChange={setSlideLinkId}>
                  <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                  <SelectContent>
                    {allTracksForLink.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title} — {t.artist}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {slideLinkType === 'video' && (
                <Select value={slideLinkId} onValueChange={setSlideLinkId}>
                  <SelectTrigger><SelectValue placeholder="Select a video" /></SelectTrigger>
                  <SelectContent>
                    {allVideosForLink.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.title} — {v.artist}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <input type="file" accept="image/*" ref={imageRef} className="hidden" onChange={e => setSlideImage(e.target.files?.[0] || null)} />
            <div onClick={() => imageRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{slideImage ? slideImage.name : 'Upload cover image (optional)'}</p>
            </div>
            <Button className="rounded-full w-full" onClick={handleAddSlide} disabled={!slideTitle.trim()}>
              Pay & Create Slide
            </Button>
          </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <SubscriptionGate subscription={subscription} onSubscribe={() => setSubModalOpen(true)} onRefresh={loadData}>
        <div>
          <div className="flex gap-2 mb-4">
            {(['all', 'music', 'video'] as const).map(f => (
              <button key={f} onClick={() => setContentFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${contentFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{f}</button>
            ))}
          </div>
          <div className="bg-card rounded-xl divide-y divide-border">
            {filteredContent.map(item => (
              <div key={item.id + item.type} className="flex items-center gap-3 p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'music' ? 'bg-primary/10' : 'bg-accent'}`}>
                  {item.type === 'music' ? <Music className="w-4 h-4 text-primary" /> : <Video className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.genre} • {item.type === 'music' ? (item as any).plays + ' plays' : (item as any).views + ' views'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  title="Edit"
                  onClick={() => handleEditItem(item.type, item)}
                >
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  title={(item as any).recentlyAdded ? 'Remove from Recently Added' : 'Mark as Recently Added'}
                  onClick={() => handleToggleRecent(item.type === 'music' ? 'tracks' : 'videos', item.id, !!(item as any).recentlyAdded)}
                >
                  {(item as any).recentlyAdded ? <Star className="w-3.5 h-3.5 fill-primary text-primary" /> : <StarOff className="w-3.5 h-3.5 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive"
                  onClick={() => item.type === 'music' ? handleDeleteTrack(item.id) : handleDeleteVideo(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            {filteredContent.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No content found.</p>}
          </div>
        </div>
        </SubscriptionGate>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              {profilePhotoPreview ? (
                <img src={profilePhotoPreview} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground"
                  style={{ background: profile?.gradientFrom ? `linear-gradient(135deg, ${profile.gradientFrom}, ${profile.gradientTo})` : 'hsl(var(--primary))' }}>
                  {(profileName || '?')[0].toUpperCase()}
                </div>
              )}
              <input type="file" accept="image/*" ref={profilePhotoRef} className="hidden" onChange={e => handleProfilePhotoSelect(e.target.files?.[0] || null)} />
              <button
                onClick={() => profilePhotoRef.current?.click()}
                className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-background" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium">{profileName || 'Your Name'}</p>
              <p className="text-xs text-muted-foreground">Click photo to change</p>
            </div>
          </div>
          <Input placeholder="Artist Name" value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={100} />
          <Select value={profileGenre} onValueChange={setProfileGenre}>
            <SelectTrigger><SelectValue placeholder="Select your genre" /></SelectTrigger>
            <SelectContent>
              {uploadGenres.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Email" value={user.email || ''} disabled maxLength={255} />
          <Input placeholder="Phone Number" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} maxLength={20} />
          <Input placeholder="Address" value={profileAddress} onChange={e => setProfileAddress(e.target.value)} maxLength={200} />
          <textarea placeholder="Bio" value={profileBio} onChange={e => setProfileBio(e.target.value)} maxLength={500} rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          <Button className="rounded-full w-full" onClick={handleSaveProfile} disabled={uploading}>
            {uploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
      {activeTab === 'subscription' && (
        <StorageManagement artistId={artistId} />
      )}

      <EditContentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        type={editType}
        item={editItem}
        onSave={handleSaveEdit}
      />
      <EditHeroSlideModal
        open={editSlideOpen}
        onOpenChange={setEditSlideOpen}
        slide={editSlide}
        tracksForLink={allTracksForLink}
        videosForLink={allVideosForLink}
        onSave={handleSaveSlide}
      />
      <SubscriptionModal
        open={subModalOpen}
        onOpenChange={setSubModalOpen}
        artistId={artistId}
        currentPlanId={subscription?.planId}
        onSubscribed={loadData}
      />
      <HeroSlidePaymentModal
        open={heroPaymentOpen}
        onOpenChange={setHeroPaymentOpen}
        slideData={pendingSlideData}
        onSuccess={handleHeroPaymentSuccess}
      />
    </div>
  );
};

export default ArtistDashboard;
