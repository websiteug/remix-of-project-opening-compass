import {
  collection, getDocs, getDoc, doc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, increment, arrayUnion, arrayRemove, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Track, Artist, MusicVideo } from './types';

// ========== UPLOAD HELPERS (browser -> Cloudflare R2) ==========

// The app only asks Vercel for a short-lived signed URL. File bytes never
// enter a Vercel function, so uploads avoid Vercel request-body transfer.
export type UploadProgressCallback = (progress: number) => void;

async function uploadDirectToR2(file: File, folder: string, onProgress?: UploadProgressCallback): Promise<string> {
  const presignResponse = await fetch('/api/public/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      folder,
    }),
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get upload URL');
  }

  const { presignedUrl, publicUrl, contentType } = await presignResponse.json();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(publicUrl);
      } else {
        reject(new Error(`Direct upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during direct upload'));
    xhr.send(file);
  });
}

export async function uploadToR2(file: File, folder: string, onProgress?: UploadProgressCallback): Promise<string> {
  console.log(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) directly to R2`);
  return uploadDirectToR2(file, folder, onProgress);
}



// ========== TRACKS ==========
export type TrackFilter = 'All' | 'New Release' | 'Top Downloaded' | 'This Week' | 'This Month' | 'This Year';

function getDateThreshold(filter: TrackFilter): string | null {
  const now = new Date();
  switch (filter) {
    case 'This Week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    case 'This Month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.toISOString().split('T')[0];
    }
    case 'This Year': {
      return `${now.getFullYear()}-01-01`;
    }
    default:
      return null;
  }
}

/** Sort newest first: prefers the Firestore createdAt timestamp, falls back to addedDate. */
export function newestFirst(a: Track, b: Track): number {
  const toTime = (t: Track): number => {
    const ca = (t as any).createdAt;
    if (ca?.toMillis) return ca.toMillis();
    if (typeof ca === 'number') return ca;
    if (ca?.seconds) return ca.seconds * 1000;
    return Date.parse(t.addedDate || '') || 0;
  };
  return toTime(b) - toTime(a);
}

export async function fetchTracks(genre?: string, filter?: TrackFilter): Promise<Track[]> {
  try {
    const q = genre && genre !== 'All'
      ? query(collection(db, 'tracks'), where('genre', '==', genre))
      : collection(db, 'tracks');
    const snap = await getDocs(q);
    let tracks = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Normalize field names (some uploads use camelCase instead of uppercase)
        audioURL: data.audioURL || data.audioUrl || '',
        coverURL: 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg',
      } as Track;
    });

    // Apply filter
    if (filter && filter !== 'All') {
      const threshold = getDateThreshold(filter);
      if (threshold) {
        tracks = tracks.filter(t => (t.addedDate || '') >= threshold);
      }
      if (filter === 'New Release') {
        tracks.sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
      } else if (filter === 'Top Downloaded') {
        tracks.sort((a, b) => parseInt(b.downloads || '0') - parseInt(a.downloads || '0'));
      }
    } else {
      // Default: newest uploads first (createdAt timestamp wins over date string)
      tracks.sort((a, b) => newestFirst(a, b));
    }

    return tracks;
  } catch (err) {
    console.error('Error fetching tracks:', err);
    return [];
  }
}

export async function fetchTrackById(id: string): Promise<Track | null> {
  try {
    const snap = await getDoc(doc(db, 'tracks', id));
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        audioURL: data.audioURL || data.audioUrl || '',
        coverURL: 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg',
      } as Track;
    }
    return null;
  } catch (err) {
    console.error('Error fetching track:', err);
    return null;
  }
}

export async function uploadTrack(data: {
  title: string;
  genre: string;
  description?: string;
  artistId: string;
  artistName: string;
  audioFile?: File;
  /** Optional external link (e.g. Google Drive share link) used instead of a file. */
  audioUrl?: string;
  coverFile?: File;
  onProgress?: UploadProgressCallback;
}) {
  let audioURL = data.audioUrl?.trim() || '';
  const coverURL = 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg';

  if (data.audioFile) {
    audioURL = await uploadToR2(data.audioFile, 'tracks', data.onProgress);
  }

  const hue = Math.floor(Math.random() * 360);
  const trackDoc = await addDoc(collection(db, 'tracks'), {
    title: data.title,
    artist: data.artistName,
    artistId: data.artistId,
    genre: data.genre,
    description: data.description || '',
    duration: '3:30',
    plays: '0',
    downloads: '0',
    audioURL,
    coverURL,
    recentlyAdded: false,
    gradientFrom: `hsl(${hue}, 70%, 50%)`,
    gradientTo: `hsl(${(hue + 40) % 360}, 80%, 45%)`,
    addedDate: new Date().toISOString().split('T')[0],
    createdAt: serverTimestamp(),
  });

  try {
    await updateDoc(doc(db, 'artists', data.artistId), { trackCount: increment(1) });
  } catch {}

  return trackDoc.id;
}

export async function updateTrack(trackId: string, data: { title?: string; genre?: string; description?: string }) {
  try {
    await updateDoc(doc(db, 'tracks', trackId), data);
  } catch (err) {
    console.error('Error updating track:', err);
    throw err;
  }
}

export async function deleteTrack(trackId: string) {
  await deleteDoc(doc(db, 'tracks', trackId));
}

export async function toggleRecentlyAdded(type: 'tracks' | 'videos', itemId: string, isRecent: boolean) {
  await updateDoc(doc(db, type, itemId), { recentlyAdded: !isRecent });
}

// ========== VIDEOS ==========
export async function fetchVideos(genre?: string): Promise<MusicVideo[]> {
  try {
    const q = genre && genre !== 'All'
      ? query(collection(db, 'videos'), where('genre', '==', genre))
      : collection(db, 'videos');
    const snap = await getDocs(q);
    const videos = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        videoURL: data.videoURL || data.videoUrl || '',
        thumbnailURL: data.thumbnailURL || data.thumbnailUrl || '',
        _createdAtMs: (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0),
      } as MusicVideo & { _createdAtMs: number };
    });
    // Sort: newest first (by createdAt then addedDate fallback)
    videos.sort((a, b) => {
      const am = (a as any)._createdAtMs || new Date((a as any).addedDate || 0).getTime();
      const bm = (b as any)._createdAtMs || new Date((b as any).addedDate || 0).getTime();
      return bm - am;
    });
    return videos;
  } catch (err) {
    console.error('Error fetching videos:', err);
    return [];
  }
}

export async function fetchVideoById(id: string): Promise<MusicVideo | null> {
  try {
    const snap = await getDoc(doc(db, 'videos', id));
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        ...data,
        videoURL: data.videoURL || data.videoUrl || '',
        thumbnailURL: data.thumbnailURL || data.thumbnailUrl || '',
      } as MusicVideo;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function incrementVideoViews(videoId: string) {
  try {
    await updateDoc(doc(db, 'videos', videoId), { views: increment(1) });
  } catch (err) {
    console.error('Error incrementing views:', err);
  }
}

export async function uploadVideo(data: {
  title: string;
  genre: string;
  description?: string;
  artistId: string;
  artistName: string;
  videoFile?: File;
  /** Optional external link (e.g. Google Drive share link) used instead of a file. */
  videoUrl?: string;
  thumbnailFile?: File;
  onProgress?: UploadProgressCallback;
}) {
  let videoURL = data.videoUrl?.trim() || '';
  let thumbnailURL = 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg';

  if (data.videoFile) {
    videoURL = await uploadToR2(data.videoFile, 'videos', data.onProgress);
  }

  // Upload extracted/provided thumbnail so the carousel and cards show the real frame
  if (data.thumbnailFile) {
    try {
      thumbnailURL = await uploadToR2(data.thumbnailFile, 'thumbnails');
    } catch (err) {
      console.warn('Thumbnail upload failed, falling back to default:', err);
    }
  }

  const hue = Math.floor(Math.random() * 360);
  const videoDoc = await addDoc(collection(db, 'videos'), {
    title: data.title,
    artist: data.artistName,
    artistId: data.artistId,
    genre: data.genre,
    description: data.description || '',
    duration: '4:00',
    views: '0',
    videoURL,
    thumbnailURL,
    recentlyAdded: false,
    gradientFrom: `hsl(${hue}, 70%, 50%)`,
    gradientTo: `hsl(${(hue + 40) % 360}, 80%, 45%)`,
    addedDate: new Date().toISOString().split('T')[0],
    createdAt: serverTimestamp(),
  });

  return videoDoc.id;
}

export async function updateVideo(videoId: string, data: { title?: string; genre?: string; description?: string }) {
  try {
    await updateDoc(doc(db, 'videos', videoId), data);
  } catch (err) {
    console.error('Error updating video:', err);
    throw err;
  }
}

export async function deleteVideo(videoId: string) {
  await deleteDoc(doc(db, 'videos', videoId));
}

// ========== ARTISTS ==========
export async function fetchArtists(): Promise<Artist[]> {
  try {
    const snap = await getDocs(collection(db, 'artists'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Artist));
  } catch (err) {
    console.error('Error fetching artists:', err);
    return [];
  }
}

export async function fetchArtistById(id: string): Promise<Artist | null> {
  try {
    const snap = await getDoc(doc(db, 'artists', id));
    if (snap.exists()) return { id: snap.id, ...snap.data() } as Artist;
    return null;
  } catch (err) {
    return null;
  }
}

export async function updateArtistPhoto(artistId: string, photoFile: File): Promise<string> {
  const photoURL = await uploadToR2(photoFile, 'profiles');
  await setDoc(doc(db, 'users', artistId), { photoURL }, { merge: true });
  await setDoc(doc(db, 'artists', artistId), { photoURL }, { merge: true });
  return photoURL;
}

// ========== HERO SLIDES ==========
export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  artist: string;
  artistId: string;
  badge: string;
  gradientFrom: string;
  gradientTo: string;
  imageURL?: string;
  linkedContentId?: string;
  linkedContentType?: 'track' | 'video';
  ctaText?: string;
  // Payment & expiration fields
  expiresAt?: any;
  planId?: string;
  purchasedAt?: any;
  paymentPhone?: string;
  paymentRef?: string;
  status?: 'pending' | 'active' | 'expired';
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  try {
    const snap = await getDocs(collection(db, 'heroSlides'));
    const now = new Date();
    const slides: HeroSlide[] = [];
    
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      
      // Check if slide has expiration and if it's expired
      if (data.expiresAt) {
        let expiresDate: Date;
        if (data.expiresAt instanceof Timestamp) {
          expiresDate = data.expiresAt.toDate();
        } else if (data.expiresAt?.seconds) {
          expiresDate = new Date(data.expiresAt.seconds * 1000);
        } else {
          expiresDate = new Date(data.expiresAt);
        }

        if (expiresDate < now) {
          // Auto-delete expired slide
          console.log('[HeroSlide] Auto-deleting expired slide:', docSnap.id);
          await deleteDoc(doc(db, 'heroSlides', docSnap.id));
          continue;
        }
      }
      
      const slide = { id: docSnap.id, ...data } as HeroSlide;

      if (slide.linkedContentType === 'video' && slide.linkedContentId) {
        try {
          const linkedVideoSnap = await getDoc(doc(db, 'videos', slide.linkedContentId));
          if (linkedVideoSnap.exists()) {
            const linkedVideo = linkedVideoSnap.data();
            slide.imageURL = linkedVideo.thumbnailURL || linkedVideo.thumbnailUrl || slide.imageURL || '';
          }
        } catch (err) {
          console.warn('Error resolving linked video thumbnail for hero slide:', err);
        }
      }

      slides.push(slide);
    }

    // ===== Auto-feature recently uploaded tracks/videos (last 24h) =====
    try {
      const oneDayAgoMs = now.getTime() - 24 * 60 * 60 * 1000;
      const linkedIds = new Set(slides.map(s => s.linkedContentId).filter(Boolean));

      const [tracksSnap, videosSnap] = await Promise.all([
        getDocs(collection(db, 'tracks')),
        getDocs(collection(db, 'videos')),
      ]);

      const recentItems: Array<{ id: string; data: any; type: 'track' | 'video'; ts: number }> = [];

      tracksSnap.docs.forEach(d => {
        const data = d.data();
        const ts = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
        if (ts >= oneDayAgoMs && !linkedIds.has(d.id)) {
          recentItems.push({ id: d.id, data, type: 'track', ts });
        }
      });
      videosSnap.docs.forEach(d => {
        const data = d.data();
        const ts = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
        if (ts >= oneDayAgoMs && !linkedIds.has(d.id)) {
          recentItems.push({ id: d.id, data, type: 'video', ts });
        }
      });

      // Newest first, cap to 5 auto slides
      recentItems.sort((a, b) => b.ts - a.ts);
      const autoSlides: HeroSlide[] = recentItems.slice(0, 5).map(item => {
        const hue = Math.floor(Math.random() * 360);
        return {
          id: `auto-${item.type}-${item.id}`,
          title: item.data.title || 'New Release',
          subtitle: item.type === 'video' ? 'Fresh new music video' : 'Just dropped — listen now',
          artist: item.data.artist || 'Unknown',
          artistId: item.data.artistId || '',
          badge: item.type === 'video' ? '🎬 NEW VIDEO' : '🔥 NEW RELEASE',
          gradientFrom: item.data.gradientFrom || `${hue} 70% 55%`,
          gradientTo: item.data.gradientTo || `${(hue + 30) % 360} 75% 60%`,
          imageURL: item.type === 'video'
            ? (item.data.thumbnailURL || item.data.thumbnailUrl || item.data.coverURL || '')
            : (item.data.coverURL || ''),
          linkedContentId: item.id,
          linkedContentType: item.type,
          ctaText: item.type === 'video' ? 'Watch Now' : 'Listen Now',
          status: 'active',
        };
      });

      // Auto slides shown first
      return [...autoSlides, ...slides];
    } catch (e) {
      console.error('Error building auto hero slides:', e);
      return slides;
    }
  } catch (err) {
    console.error('Error fetching hero slides:', err);
    return [];
  }
}

export async function addHeroSlide(data: {
  title: string;
  subtitle?: string;
  artist: string;
  artistId: string;
  badge: string;
  imageFile?: File;
  linkedContentId?: string;
  linkedContentType?: 'track' | 'video';
  ctaText?: string;
  durationDays?: number;
}): Promise<string> {
  let imageURL = '';
  if (data.imageFile) {
    imageURL = await uploadToR2(data.imageFile, 'hero');
  }
  const hue = Math.floor(Math.random() * 360);
  const now = new Date();
  const durationDays = data.durationDays || 7;
  const expiresAt = Timestamp.fromDate(new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000));
  const docRef = await addDoc(collection(db, 'heroSlides'), {
    title: data.title,
    subtitle: data.subtitle || '',
    artist: data.artist,
    artistId: data.artistId,
    badge: data.badge,
    imageURL,
    linkedContentId: data.linkedContentId || '',
    linkedContentType: data.linkedContentType || '',
    ctaText: data.ctaText || 'Listen Now',
    gradientFrom: `${hue} 70% 55%`,
    gradientTo: `${(hue + 30) % 360} 75% 60%`,
    createdAt: serverTimestamp(),
    expiresAt,
    durationDays,
    status: 'active',
  });
  return docRef.id;
}

export async function deleteHeroSlide(slideId: string) {
  await deleteDoc(doc(db, 'heroSlides', slideId));
}

export async function updateHeroSlide(slideId: string, data: {
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  linkedContentId?: string;
  linkedContentType?: 'track' | 'video' | '';
  imageFile?: File;
}) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
  if (data.badge !== undefined) updateData.badge = data.badge;
  if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
  if (data.linkedContentId !== undefined) updateData.linkedContentId = data.linkedContentId;
  if (data.linkedContentType !== undefined) updateData.linkedContentType = data.linkedContentType;

  if (data.imageFile) {
    const imageURL = await uploadToR2(data.imageFile, 'hero');
    updateData.imageURL = imageURL;
  }

  await updateDoc(doc(db, 'heroSlides', slideId), updateData);
}

// ========== PLAYLISTS ==========
export interface PlaylistDoc {
  id: string;
  name: string;
  userId: string;
  trackIds: string[];
  coverURL?: string;
  createdAt?: any;
}

export async function fetchUserPlaylists(userId: string): Promise<PlaylistDoc[]> {
  try {
    const q = query(collection(db, 'playlists'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistDoc));
  } catch (err) {
    console.error('Error fetching playlists:', err);
    return [];
  }
}

export async function fetchAllPlaylists(): Promise<PlaylistDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'playlists'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistDoc));
  } catch (err) {
    console.error('Error fetching all playlists:', err);
    return [];
  }
}

export async function updatePlaylistCover(playlistId: string, coverFile: File): Promise<string> {
  const coverURL = await uploadToR2(coverFile, 'playlist-covers');
  await updateDoc(doc(db, 'playlists', playlistId), { coverURL });
  return coverURL;
}

export async function createPlaylist(userId: string, name: string, coverFile?: File): Promise<string> {
  let coverURL = '';
  if (coverFile) {
    coverURL = await uploadToR2(coverFile, 'playlist-covers');
  }
  const docRef = await addDoc(collection(db, 'playlists'), {
    name,
    userId,
    trackIds: [],
    coverURL,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deletePlaylist(playlistId: string) {
  await deleteDoc(doc(db, 'playlists', playlistId));
}

export async function addTrackToPlaylist(playlistId: string, trackId: string) {
  await updateDoc(doc(db, 'playlists', playlistId), {
    trackIds: arrayUnion(trackId),
  });
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  await updateDoc(doc(db, 'playlists', playlistId), {
    trackIds: arrayRemove(trackId),
  });
}

// ========== FAVOURITES ==========
export async function fetchUserFavourites(userId: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'favourites', userId));
    if (snap.exists()) return (snap.data().trackIds || []) as string[];
    return [];
  } catch (err) {
    console.error('Error fetching favourites:', err);
    return [];
  }
}

export async function toggleFavourite(userId: string, trackId: string, isFav: boolean) {
  const favRef = doc(db, 'favourites', userId);
  if (isFav) {
    await setDoc(favRef, { trackIds: arrayRemove(trackId), userId }, { merge: true });
  } else {
    await setDoc(favRef, { trackIds: arrayUnion(trackId), userId }, { merge: true });
  }
}

// ========== FOLLOWS ==========
export async function toggleFollow(userId: string, artistId: string, isFollowing: boolean) {
  const followRef = doc(db, 'follows', `${userId}_${artistId}`);
  if (isFollowing) {
    await deleteDoc(followRef);
    try { await updateDoc(doc(db, 'artists', artistId), { followers: increment(-1) }); } catch {}
  } else {
    await setDoc(followRef, { userId, artistId, createdAt: serverTimestamp() });
    try { await updateDoc(doc(db, 'artists', artistId), { followers: increment(1) }); } catch {}
  }
}

export async function checkFollowing(userId: string, artistId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'follows', `${userId}_${artistId}`));
    return snap.exists();
  } catch {
    return false;
  }
}

// ========== SELEB TALK (Posts) ==========
export interface PostDoc {
  id: string;
  artistId: string;
  artistName: string;
  content: string;
  imageURL?: string;
  likes: number;
  likedBy: string[];
  comments: CommentDoc[];
  createdAt?: any;
}

export interface CommentDoc {
  id?: string;
  user: string;
  userId?: string;
  text: string;
  time: string;
  likes: number;
  likedBy: string[];
}

export async function fetchPosts(): Promise<PostDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'posts'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PostDoc));
  } catch (err) {
    console.error('Error fetching posts:', err);
    return [];
  }
}

export async function createPost(data: {
  artistId: string;
  artistName: string;
  content: string;
  imageFile?: File;
  userId: string;
}): Promise<string> {
  let imageURL = '';
  if (data.imageFile) {
    imageURL = await uploadToR2(data.imageFile, 'posts');
  }
  const docRef = await addDoc(collection(db, 'posts'), {
    artistId: data.artistId,
    artistName: data.artistName,
    content: data.content,
    imageURL,
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function togglePostLike(postId: string, userId: string, isLiked: boolean) {
  const postRef = doc(db, 'posts', postId);
  if (isLiked) {
    await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(userId) });
  } else {
    await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(userId) });
  }
}

export async function addPostComment(postId: string, comment: CommentDoc) {
  await updateDoc(doc(db, 'posts', postId), {
    comments: arrayUnion(comment),
  });
}

// ========== REELS ==========
export interface ReelDoc {
  id: string;
  artistId: string;
  artistName: string;
  caption: string;
  audioTitle: string;
  likes: number;
  likedBy: string[];
  comments: CommentDoc[];
  shares: number;
  gradientFrom: string;
  gradientTo: string;
  videoURL?: string;
  createdAt?: any;
}

export async function fetchReels(): Promise<ReelDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'reels'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReelDoc));
  } catch (err) {
    console.error('Error fetching reels:', err);
    return [];
  }
}

export async function createReel(data: {
  artistId: string;
  artistName: string;
  caption: string;
  audioTitle: string;
  videoFile?: File;
}) {
  let videoURL = '';
  if (data.videoFile) {
    videoURL = await uploadToR2(data.videoFile, 'reels');
  }
  const hue = Math.floor(Math.random() * 360);
  await addDoc(collection(db, 'reels'), {
    artistId: data.artistId,
    artistName: data.artistName,
    caption: data.caption,
    audioTitle: data.audioTitle,
    videoURL,
    likes: 0,
    likedBy: [],
    comments: [],
    shares: 0,
    gradientFrom: `hsl(${hue}, 70%, 50%)`,
    gradientTo: `hsl(${(hue + 40) % 360}, 80%, 45%)`,
    createdAt: serverTimestamp(),
  });
}

export async function toggleReelLike(reelId: string, userId: string, isLiked: boolean) {
  const reelRef = doc(db, 'reels', reelId);
  if (isLiked) {
    await updateDoc(reelRef, { likes: increment(-1), likedBy: arrayRemove(userId) });
  } else {
    await updateDoc(reelRef, { likes: increment(1), likedBy: arrayUnion(userId) });
  }
}

export async function addReelComment(reelId: string, comment: CommentDoc) {
  await updateDoc(doc(db, 'reels', reelId), {
    comments: arrayUnion(comment),
  });
}

// ========== NOTIFICATIONS ==========
export interface NotificationDoc {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'upload' | 'system';
  message: string;
  read: boolean;
  createdAt?: any;
  linkTo?: string;
}

export async function fetchNotifications(userId: string): Promise<NotificationDoc[]> {
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationDoc));
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  const promises = snap.docs.map(d => updateDoc(d.ref, { read: true }));
  await Promise.all(promises);
}

export async function createNotification(data: { userId: string; type: NotificationDoc['type']; message: string; linkTo?: string }) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ========== SEARCH ==========
export async function searchAll(searchQuery: string): Promise<{ tracks: Track[]; artists: Artist[]; videos: MusicVideo[] }> {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return { tracks: [], artists: [], videos: [] };

  const [allTracks, allArtists, allVideos] = await Promise.all([
    fetchTracks(),
    fetchArtists(),
    fetchVideos(),
  ]);

  return {
    tracks: allTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
    artists: allArtists.filter(a => a.name.toLowerCase().includes(q) || a.genre?.toLowerCase().includes(q)),
    videos: allVideos.filter(v => v.title.toLowerCase().includes(q) || v.artist.toLowerCase().includes(q)),
  };
}

// ========== FILE UPLOAD HELPER ==========
export async function uploadFile(path: string, file: File): Promise<string> {
  return uploadToR2(file, path);
}

// ========== ARTIST CONTENT (for dashboard) ==========
export async function fetchArtistTracks(artistId: string): Promise<Track[]> {
  try {
    const q = query(collection(db, 'tracks'), where('artistId', '==', artistId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        audioURL: data.audioURL || data.audioUrl || '',
        coverURL: data.coverURL || data.coverUrl || '',
      } as Track;
    });
  } catch (err) {
    return [];
  }
}

export async function fetchArtistVideos(artistId: string): Promise<MusicVideo[]> {
  try {
    const q = query(collection(db, 'videos'), where('artistId', '==', artistId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MusicVideo));
  } catch (err) {
    return [];
  }
}
