import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ========== SUBSCRIPTION PLANS ==========
export interface SubscriptionPlan {
  id: string;
  name: string;
  storageGB: number;
  priceUGX: number;
  durationDays: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'plan_1gb', name: '1 GB Storage', storageGB: 1, priceUGX: 10000, durationDays: 30 },
  { id: 'plan_2gb', name: '2 GB Storage', storageGB: 2, priceUGX: 15000, durationDays: 30 },
  { id: 'plan_3gb', name: '3 GB Storage', storageGB: 3, priceUGX: 20000, durationDays: 30 },
  { id: 'plan_5gb', name: '5 GB Storage', storageGB: 5, priceUGX: 30000, durationDays: 30 },
  { id: 'plan_10gb', name: '10 GB Storage', storageGB: 10, priceUGX: 50000, durationDays: 30 },
];

// ========== MOBILE MONEY PROVIDERS ==========
export interface MobileMoneyProvider {
  id: string;
  name: string;
  icon: string;
  paymentNumber: string;
  instructions: string;
}

export const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    icon: '🟡',
    paymentNumber: '0770000000',
    instructions: 'Dial *165*3# and send payment to the number above',
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    icon: '🔴',
    paymentNumber: '0750000000',
    instructions: 'Dial *185*9# and send payment to the number above',
  },
];

// ========== SUBSCRIPTION DOCUMENT ==========
export interface ArtistSubscription {
  artistId: string;
  planId: string;
  storageGB: number;
  storageUsedBytes: number;
  status: 'active' | 'expired' | 'none';
  subscribedAt?: any;
  expiresAt?: any;
  paymentRef?: string;
  paymentProvider?: string;
  paymentPhone?: string;
}

// ========== FETCH SUBSCRIPTION ==========
export async function fetchArtistSubscription(artistId: string): Promise<ArtistSubscription | null> {
  try {
    const snap = await getDoc(doc(db, 'subscriptions', artistId));
    if (!snap.exists()) {
      console.log('[Subscription] No subscription found for artist:', artistId);
      return null;
    }

    const data = snap.data() as ArtistSubscription;
    console.log('[Subscription] Loaded subscription:', { status: data.status, planId: data.planId, storageGB: data.storageGB });

    // Check if expired
    if (data.expiresAt && data.status === 'active') {
      let expiresDate: Date;
      if (data.expiresAt instanceof Timestamp) {
        expiresDate = data.expiresAt.toDate();
      } else if (data.expiresAt?.seconds) {
        // Handle Firestore timestamp object that wasn't properly deserialized
        expiresDate = new Date(data.expiresAt.seconds * 1000);
      } else {
        expiresDate = new Date(data.expiresAt);
      }

      if (expiresDate < new Date()) {
        console.log('[Subscription] Auto-expiring subscription');
        await updateDoc(doc(db, 'subscriptions', artistId), { status: 'expired' });
        return { ...data, status: 'expired' };
      }
    }

    return data;
  } catch (err) {
    console.error('[Subscription] Error fetching subscription:', err);
    return null;
  }
}

// ========== SUBSCRIBE ==========
export async function subscribePlan(
  artistId: string,
  planId: string,
  paymentRef?: string,
  paymentProvider?: string,
  paymentPhone?: string,
): Promise<ArtistSubscription> {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // ALWAYS reset storage to 0 on new subscription or renewal
  // This gives artists full fresh storage when they subscribe/renew
  const storageUsedBytes = 0;
  console.log('[Subscription] Resetting storage to 0 for new subscription');

  const subData: Record<string, any> = {
    artistId,
    planId: plan.id,
    storageGB: plan.storageGB,
    storageUsedBytes,
    status: 'active',
    subscribedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    paymentRef: paymentRef || `PAY-${Date.now()}`,
    paymentProvider: paymentProvider || '',
    paymentPhone: paymentPhone || '',
  };

  await setDoc(doc(db, 'subscriptions', artistId), subData);
  console.log('[Subscription] Plan activated:', plan.name);

  // Return a resolved version (not server timestamp sentinel)
  return {
    artistId,
    planId: plan.id,
    storageGB: plan.storageGB,
    storageUsedBytes,
    status: 'active',
    subscribedAt: now,
    expiresAt: Timestamp.fromDate(expiresAt),
    paymentRef: subData.paymentRef,
    paymentProvider: subData.paymentProvider,
    paymentPhone: subData.paymentPhone,
  };
}

// ========== UPDATE STORAGE USED ==========
export async function addStorageUsage(artistId: string, fileSizeBytes: number): Promise<void> {
  const subRef = doc(db, 'subscriptions', artistId);
  const snap = await getDoc(subRef);
  if (!snap.exists()) throw new Error('No subscription found');

  const data = snap.data() as ArtistSubscription;
  const newUsed = (data.storageUsedBytes || 0) + fileSizeBytes;

  const limitBytes = data.storageGB * 1024 * 1024 * 1024;
  if (newUsed > limitBytes) {
    throw new Error('Storage limit exceeded. Please upgrade your plan.');
  }

  await updateDoc(subRef, { storageUsedBytes: newUsed });
}

// ========== REDUCE STORAGE (on delete) ==========
export async function reduceStorageUsage(artistId: string, fileSizeBytes: number): Promise<void> {
  const subRef = doc(db, 'subscriptions', artistId);
  const snap = await getDoc(subRef);
  if (!snap.exists()) return;

  const data = snap.data() as ArtistSubscription;
  const newUsed = Math.max(0, (data.storageUsedBytes || 0) - fileSizeBytes);
  await updateDoc(subRef, { storageUsedBytes: newUsed });
}

// ========== CHECK UPLOAD ALLOWED ==========
export async function canUpload(artistId: string, fileSizeBytes: number): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await fetchArtistSubscription(artistId);

  if (!sub || sub.status === 'none') {
    return { allowed: false, reason: 'No active subscription. Please subscribe to a storage plan to upload content.' };
  }

  if (sub.status === 'expired') {
    return { allowed: false, reason: 'Your subscription has expired. Please renew to continue uploading.' };
  }

  const limitBytes = sub.storageGB * 1024 * 1024 * 1024;
  const newUsed = (sub.storageUsedBytes || 0) + fileSizeBytes;

  if (newUsed > limitBytes) {
    const remainingMB = Math.max(0, (limitBytes - (sub.storageUsedBytes || 0)) / (1024 * 1024));
    return {
      allowed: false,
      reason: `Not enough storage. You have ${remainingMB.toFixed(1)} MB remaining. Please upgrade your plan.`,
    };
  }

  return { allowed: true };
}

// ========== HELPERS ==========
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

export function getExpiryDate(sub: ArtistSubscription | null): Date | null {
  if (!sub?.expiresAt) return null;
  if (sub.expiresAt instanceof Timestamp) return sub.expiresAt.toDate();
  if (sub.expiresAt?.seconds) return new Date(sub.expiresAt.seconds * 1000);
  return new Date(sub.expiresAt);
}

export function getDaysRemaining(sub: ArtistSubscription | null): number {
  const expiry = getExpiryDate(sub);
  if (!expiry) return 0;
  const diff = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
