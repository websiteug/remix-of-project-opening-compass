import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'artist';
  artistName?: string;
  bio?: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  followers?: number;
  genre?: string;
  gradientFrom?: string;
  gradientTo?: string;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'user' | 'artist') => Promise<User>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean; user: User }>;
  logOut: () => Promise<void>;
  completeArtistOnboarding: (data: { artistName: string; bio: string; phone: string; address: string; genre?: string }) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate random gradient colors for new users
const randomGradient = () => {
  const hue = Math.floor(Math.random() * 360);
  return {
    gradientFrom: `hsl(${hue}, 70%, 50%)`,
    gradientTo: `hsl(${(hue + 40) % 360}, 80%, 45%)`,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Defer Firestore call to avoid deadlock
        setTimeout(async () => {
          const p = await fetchProfile(firebaseUser.uid);
          setProfile(p);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Welcome back!', description: 'You have signed in successfully.' });
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password.'
        : err.code === 'auth/user-not-found' ? 'No account found with this email.'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.'
        : 'Sign in failed. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'user' | 'artist'): Promise<User> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const gradient = randomGradient();
      const profileData: UserProfile = {
        uid: cred.user.uid,
        name,
        email,
        role,
        photoURL: cred.user.photoURL || '',
        followers: 0,
        ...gradient,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profileData);
      setProfile(profileData);
      toast({ title: 'Account created!', description: 'Welcome to VYBE.' });
      return cred.user;
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use' ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password' ? 'Password should be at least 6 characters.'
        : 'Registration failed. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const existingProfile = await fetchProfile(result.user.uid);
      if (existingProfile) {
        setProfile(existingProfile);
        toast({ title: 'Welcome back!', description: 'Signed in with Google.' });
        return { isNewUser: false, user: result.user };
      }
      // New user via Google — profile will be created after role selection
      return { isNewUser: true, user: result.user };
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Error', description: 'Google sign-in failed.', variant: 'destructive' });
      }
      throw err;
    }
  };

  const completeArtistOnboarding = async (data: { artistName: string; bio: string; phone: string; address: string; genre?: string }) => {
    if (!user) return;
    const gradient = randomGradient();
    const profileData: Partial<UserProfile> = {
      artistName: data.artistName,
      bio: data.bio,
      phone: data.phone,
      address: data.address,
      genre: data.genre || 'Afrobeat',
      role: 'artist',
      ...gradient,
    };
    await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });

    // Also create an artist document for public profile
    await setDoc(doc(db, 'artists', user.uid), {
      id: user.uid,
      name: data.artistName,
      genre: data.genre || 'Afrobeat',
      followers: 0,
      ...gradient,
      trackCount: 0,
      bio: data.bio,
      phone: data.phone,
      address: data.address,
      email: user.email,
      userId: user.uid,
      createdAt: serverTimestamp(),
    });

    const updated = await fetchProfile(user.uid);
    setProfile(updated);
    toast({ title: 'Profile complete!', description: 'Your artist profile is ready.' });
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const dataWithUid = { ...data, uid: user.uid };
    await setDoc(doc(db, 'users', user.uid), dataWithUid, { merge: true });
    if (data.role === 'artist' || profile?.role === 'artist') {
      await setDoc(doc(db, 'artists', user.uid), dataWithUid, { merge: true });
    }
    const updated = await fetchProfile(user.uid);
    setProfile(updated);
  };

  const logOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    toast({ title: 'Signed out', description: 'See you next time!' });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, logOut, completeArtistOnboarding, updateUserProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
