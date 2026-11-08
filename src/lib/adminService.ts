import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ========== ADMIN EMAIL CHECK ==========
const ADMIN_EMAILS = ['lightstarrecord@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ========== USER MANAGEMENT ==========
export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'artist';
  artistName?: string;
  photoURL?: string;
  phone?: string;
  bio?: string;
  createdAt?: any;
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminUser));
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}

export async function updateUser(uid: string, data: Partial<AdminUser>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function deleteUser(uid: string): Promise<void> {
  // Delete user document
  await deleteDoc(doc(db, 'users', uid));
  // Also delete artist document if exists
  try {
    await deleteDoc(doc(db, 'artists', uid));
  } catch (e) {
    // Artist doc might not exist
  }
  // Delete subscription
  try {
    await deleteDoc(doc(db, 'subscriptions', uid));
  } catch (e) {
    // Subscription might not exist
  }
}

// ========== ARTIST MANAGEMENT ==========
export interface AdminArtist {
  id: string;
  name: string;
  email?: string;
  genre?: string;
  followers?: number;
  trackCount?: number;
  bio?: string;
  phone?: string;
  userId?: string;
  createdAt?: any;
  gradientFrom?: string;
  gradientTo?: string;
}

export async function fetchAllArtists(): Promise<AdminArtist[]> {
  try {
    const snap = await getDocs(query(collection(db, 'artists'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminArtist));
  } catch (err) {
    console.error('Error fetching artists:', err);
    return [];
  }
}

export async function createArtist(data: Omit<AdminArtist, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'artists'));
  const artistData = {
    ...data,
    id: docRef.id,
    followers: data.followers || 0,
    trackCount: data.trackCount || 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(docRef, artistData);
  return docRef.id;
}

export async function updateArtist(id: string, data: Partial<AdminArtist>): Promise<void> {
  await updateDoc(doc(db, 'artists', id), data);
}

export async function deleteArtist(id: string): Promise<void> {
  await deleteDoc(doc(db, 'artists', id));
}

// ========== SUBSCRIPTION MANAGEMENT ==========
export interface AdminSubscription {
  artistId: string;
  planId: string;
  storageGB: number;
  storageUsedBytes: number;
  status: 'active' | 'expired' | 'none';
  subscribedAt?: any;
  expiresAt?: any;
  paymentRef?: string;
}

export async function fetchAllSubscriptions(): Promise<AdminSubscription[]> {
  try {
    const snap = await getDocs(collection(db, 'subscriptions'));
    return snap.docs.map(d => ({ artistId: d.id, ...d.data() } as AdminSubscription));
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    return [];
  }
}

export async function activateSubscription(
  artistId: string,
  planId: string,
  storageGB: number,
  durationDays: number
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  
  await setDoc(doc(db, 'subscriptions', artistId), {
    artistId,
    planId,
    storageGB,
    storageUsedBytes: 0,
    status: 'active',
    subscribedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
}

export async function updateSubscriptionStatus(
  artistId: string,
  status: 'active' | 'expired' | 'none'
): Promise<void> {
  await updateDoc(doc(db, 'subscriptions', artistId), { status });
}

export async function downgradeSubscription(
  artistId: string,
  newPlanId: string,
  newStorageGB: number
): Promise<void> {
  await updateDoc(doc(db, 'subscriptions', artistId), {
    planId: newPlanId,
    storageGB: newStorageGB,
  });
}

export async function deleteSubscription(artistId: string): Promise<void> {
  await deleteDoc(doc(db, 'subscriptions', artistId));
}

// ========== CONTENT MANAGEMENT ==========
export interface AdminTrack {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  genre?: string;
  duration?: string;
  plays?: number;
  audioUrl?: string;
  coverUrl?: string;
  createdAt?: any;
}

export async function fetchAllTracks(): Promise<AdminTrack[]> {
  try {
    const snap = await getDocs(query(collection(db, 'tracks'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminTrack));
  } catch (err) {
    console.error('Error fetching tracks:', err);
    return [];
  }
}

export async function createTrack(data: Omit<AdminTrack, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'tracks'));
  await setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateTrack(id: string, data: Partial<AdminTrack> & Record<string, any>): Promise<void> {
  // Remove fields that shouldn't be written back
  const { id: _id, createdAt: _ca, ...cleanData } = data as any;
  await updateDoc(doc(db, 'tracks', id), cleanData);
}

export async function deleteTrack(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tracks', id));
}

// ========== VIDEO MANAGEMENT ==========
export interface AdminVideo {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  genre?: string;
  duration?: string;
  views?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt?: any;
}

export async function fetchAllVideos(): Promise<AdminVideo[]> {
  try {
    const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminVideo));
  } catch (err) {
    console.error('Error fetching videos:', err);
    return [];
  }
}

export async function createVideo(data: Omit<AdminVideo, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'videos'));
  await setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateVideo(id: string, data: Partial<AdminVideo> & Record<string, any>): Promise<void> {
  const { id: _id, createdAt: _ca, ...cleanData } = data as any;
  await updateDoc(doc(db, 'videos', id), cleanData);
}

export async function deleteVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'videos', id));
}

// ========== HERO SLIDES MANAGEMENT ==========
export interface AdminHeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  imageUrl: string;
  artistId?: string;
  artistName?: string;
  linkType?: string;
  linkId?: string;
  linkedContentId?: string;
  linkedContentType?: 'track' | 'video' | '';
  order?: number;
  active?: boolean;
  createdAt?: any;
}

export async function fetchAllHeroSlides(): Promise<AdminHeroSlide[]> {
  try {
    // Don't use orderBy('order') as some slides may not have the order field set,
    // which causes Firestore to exclude them from results
    const snap = await getDocs(collection(db, 'heroSlides'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Map imageURL (Firestore field) to imageUrl (interface field)
        imageUrl: data.imageURL || data.imageUrl || '',
      } as AdminHeroSlide;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    console.error('Error fetching hero slides:', err);
    return [];
  }
}

export async function createHeroSlide(data: Omit<AdminHeroSlide, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'heroSlides'));
  await setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateHeroSlide(id: string, data: Partial<AdminHeroSlide>): Promise<void> {
  await updateDoc(doc(db, 'heroSlides', id), data);
}

export async function deleteHeroSlide(id: string): Promise<void> {
  await deleteDoc(doc(db, 'heroSlides', id));
}

// ========== GENRE MANAGEMENT ==========
export interface AdminGenre {
  id: string;
  name: string;
  description?: string;
  order?: number;
  createdAt?: any;
}

export async function fetchAllGenres(): Promise<AdminGenre[]> {
  try {
    const snap = await getDocs(query(collection(db, 'genres'), orderBy('order', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminGenre));
  } catch (err) {
    console.error('Error fetching genres:', err);
    return [];
  }
}

export async function createGenre(data: Omit<AdminGenre, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'genres'));
  await setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateGenre(id: string, data: Partial<AdminGenre>): Promise<void> {
  await updateDoc(doc(db, 'genres', id), data);
}

export async function deleteGenre(id: string): Promise<void> {
  await deleteDoc(doc(db, 'genres', id));
}

// ========== SELEB TALK MANAGEMENT ==========
export interface AdminSelebTalk {
  id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  artistId?: string;
  artistName?: string;
  duration?: string;
  views?: number;
  createdAt?: any;
}

export async function fetchAllSelebTalks(): Promise<AdminSelebTalk[]> {
  try {
    const snap = await getDocs(query(collection(db, 'selebTalks'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSelebTalk));
  } catch (err) {
    console.error('Error fetching seleb talks:', err);
    return [];
  }
}

export async function createSelebTalk(data: Omit<AdminSelebTalk, 'id'>): Promise<string> {
  const docRef = doc(collection(db, 'selebTalks'));
  await setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateSelebTalk(id: string, data: Partial<AdminSelebTalk>): Promise<void> {
  await updateDoc(doc(db, 'selebTalks', id), data);
}

export async function deleteSelebTalk(id: string): Promise<void> {
  await deleteDoc(doc(db, 'selebTalks', id));
}

// ========== NOTIFICATIONS ==========
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  const docRef = doc(collection(db, 'notifications'));
  await setDoc(docRef, {
    id: docRef.id,
    userId,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendNotificationToAll(title: string, message: string): Promise<void> {
  const users = await fetchAllUsers();
  const batch = users.map(user => sendNotificationToUser(user.uid, title, message));
  await Promise.all(batch);
}
