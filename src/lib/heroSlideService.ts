import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ========== HERO SLIDE PRICING PLANS ==========
export interface HeroSlidePlan {
  id: string;
  name: string;
  durationDays: number;
  priceUGX: number;
  description: string;
}

export const HERO_SLIDE_PLANS: HeroSlidePlan[] = [
  { 
    id: 'hero_day', 
    name: '1 Day', 
    durationDays: 1, 
    priceUGX: 2000,
    description: 'Your hero slide will be featured for 1 day'
  },
  { 
    id: 'hero_week', 
    name: '1 Week', 
    durationDays: 7, 
    priceUGX: 7000,
    description: 'Your hero slide will be featured for 1 week'
  },
  { 
    id: 'hero_month', 
    name: '1 Month', 
    durationDays: 30, 
    priceUGX: 15000,
    description: 'Your hero slide will be featured for 1 month'
  },
];

// ========== HERO SLIDE PURCHASE RECORD ==========
export interface HeroSlidePurchase {
  id: string;
  slideId: string;
  artistId: string;
  planId: string;
  priceUGX: number;
  durationDays: number;
  purchasedAt: any;
  expiresAt: any;
  paymentPhone: string;
  paymentRef: string;
  status: 'active' | 'expired';
}

// ========== PURCHASE HERO SLIDE ==========
export async function purchaseHeroSlide(
  artistId: string,
  slideId: string,
  planId: string,
  paymentPhone: string,
): Promise<HeroSlidePurchase> {
  const plan = HERO_SLIDE_PLANS.find(p => p.id === planId);
  if (!plan) throw new Error('Invalid plan');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const paymentRef = `HS${Date.now()}`;

  // Update the hero slide with expiration info
  await updateDoc(doc(db, 'heroSlides', slideId), {
    expiresAt: Timestamp.fromDate(expiresAt),
    planId: plan.id,
    purchasedAt: serverTimestamp(),
    paymentPhone,
    paymentRef,
    status: 'active',
  });

  // Create purchase record
  const purchaseData: Omit<HeroSlidePurchase, 'id'> = {
    slideId,
    artistId,
    planId: plan.id,
    priceUGX: plan.priceUGX,
    durationDays: plan.durationDays,
    purchasedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    paymentPhone,
    paymentRef,
    status: 'active',
  };

  await setDoc(doc(db, 'heroSlidePurchases', paymentRef), purchaseData);

  console.log('[HeroSlide] Purchase completed:', { slideId, planId, expiresAt });

  return {
    id: paymentRef,
    ...purchaseData,
    purchasedAt: now,
    expiresAt: Timestamp.fromDate(expiresAt),
  };
}

// ========== CHECK AND DELETE EXPIRED SLIDES ==========
export async function cleanupExpiredHeroSlides(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'heroSlides'));
    const now = new Date();
    let deletedCount = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
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
          console.log('[HeroSlide] Deleting expired slide:', docSnap.id);
          await deleteDoc(doc(db, 'heroSlides', docSnap.id));
          
          // Also update purchase record
          if (data.paymentRef) {
            try {
              await updateDoc(doc(db, 'heroSlidePurchases', data.paymentRef), { status: 'expired' });
            } catch {}
          }
          
          deletedCount++;
        }
      }
    }

    console.log('[HeroSlide] Cleanup complete, deleted:', deletedCount);
    return deletedCount;
  } catch (err) {
    console.error('[HeroSlide] Cleanup error:', err);
    return 0;
  }
}

// ========== FETCH ACTIVE HERO SLIDES (with expiry check) ==========
export async function fetchActiveHeroSlides(): Promise<any[]> {
  try {
    // First cleanup expired slides
    await cleanupExpiredHeroSlides();
    
    // Then fetch remaining active slides
    const snap = await getDocs(collection(db, 'heroSlides'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[HeroSlide] Error fetching active slides:', err);
    return [];
  }
}

// ========== GET EXPIRY INFO ==========
export function getHeroSlideExpiryDate(slide: any): Date | null {
  if (!slide?.expiresAt) return null;
  if (slide.expiresAt instanceof Timestamp) return slide.expiresAt.toDate();
  if (slide.expiresAt?.seconds) return new Date(slide.expiresAt.seconds * 1000);
  return new Date(slide.expiresAt);
}

export function getHeroSlideDaysRemaining(slide: any): number {
  const expiry = getHeroSlideExpiryDate(slide);
  if (!expiry) return 0;
  const diff = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}
