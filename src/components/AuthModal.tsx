import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import GenreSelect from '@/components/GenreSelect';

type AuthView = 'role-select' | 'login' | 'register' | 'artist-onboarding';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { signIn, signUp, signInWithGoogle, completeArtistOnboarding, updateUserProfile } = useAuth();
  const [view, setView] = useState<AuthView>('role-select');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'artist'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Artist onboarding
  const [artistName, setArtistName] = useState('');
  const [artistPhone, setArtistPhone] = useState('');
  const [artistGenre, setArtistGenre] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistAddress, setArtistAddress] = useState('');


  const resetForms = () => {
    setLoginEmail(''); setLoginPassword('');
    setRegName(''); setRegEmail(''); setRegPassword('');
    setArtistName(''); setArtistPhone(''); setArtistGenre(''); setArtistBio(''); setArtistAddress('');
    setShowPassword(false);
    setIsSubmitting(false);
    setIsLoginMode(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) { setView('role-select'); resetForms(); }
    onOpenChange(val);
  };

  const handleRoleSelect = (role: 'user' | 'artist') => {
    setSelectedRole(role);
    setView('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
      handleClose(false);
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signUp(regEmail, regPassword, regName, selectedRole);
      if (selectedRole === 'artist') {
        setView('artist-onboarding');
      } else {
        handleClose(false);
      }
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { isNewUser, user: gUser } = await signInWithGoogle();
      if (isNewUser) {
        // Create profile with selected role
        await updateUserProfile({
          name: gUser.displayName || '',
          email: gUser.email || '',
          photoURL: gUser.photoURL || '',
          role: selectedRole,
          followers: 0,
        });
        if (selectedRole === 'artist') {
          setView('artist-onboarding');
        } else {
          handleClose(false);
        }
      } else {
        handleClose(false);
      }
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArtistOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistGenre) {
      toast({ title: 'Please select a genre', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await completeArtistOnboarding({
        artistName,
        bio: artistBio,
        phone: artistPhone,
        address: artistAddress,
        genre: artistGenre,
      });
      handleClose(false);
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'role-select': return 'Join VYBE';
      case 'login': return isLoginMode ? 'Welcome Back' : (selectedRole === 'artist' ? 'Artist Registration' : 'Create Account');
      case 'register': return selectedRole === 'artist' ? 'Artist Registration' : 'Create Account';
      case 'artist-onboarding': return 'Complete Your Artist Profile';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-popover backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-center font-heading">{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* STEP 1: ROLE SELECTION */}
        {view === 'role-select' && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground text-center">How would you like to join?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRoleSelect('user')}
                className="p-4 rounded-xl border-2 border-border hover:border-primary transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center text-xl">🎧</div>
                <p className="font-semibold text-sm">Listener</p>
                <p className="text-xs text-muted-foreground mt-1">Stream & download music</p>
              </button>
              <button
                onClick={() => handleRoleSelect('artist')}
                className="p-4 rounded-xl border-2 border-border hover:border-primary transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center text-xl">🎤</div>
                <p className="font-semibold text-sm">Artist</p>
                <p className="text-xs text-muted-foreground mt-1">Upload & manage content</p>
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button type="button" onClick={() => { setIsLoginMode(true); setView('login'); }} className="text-primary font-medium hover:underline">
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* STEP 2: LOGIN / REGISTER (with Google option) */}
        {view === 'login' && (
          <div className="space-y-4 mt-2">
            {!isLoginMode ? (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3">
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} required maxLength={100} />
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required maxLength={255} />
                <div className="relative">
                  <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} type={showPassword ? 'text' : 'password'} placeholder="Password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={8} maxLength={128} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : selectedRole === 'artist' ? 'Next' : 'Create Account'}
                </Button>
              </form>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-3">
                <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required maxLength={255} />
                <div className="relative">
                  <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required maxLength={128} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            )}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or</span></div>
            </div>

            <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
              {isLoginMode ? 'Sign in with Google' : 'Sign up with Google'}
            </Button>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <button type="button" onClick={() => { setView('role-select'); setIsLoginMode(false); resetForms(); }} className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              {isLoginMode ? (
                <p>
                  No account?{' '}
                  <button type="button" onClick={() => { setIsLoginMode(false); setView('role-select'); }} className="text-primary font-medium hover:underline">Sign Up</button>
                </p>
              ) : (
                <p>
                  Have an account?{' '}
                  <button type="button" onClick={() => setIsLoginMode(true)} className="text-primary font-medium hover:underline">Sign In</button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: ARTIST ONBOARDING (full profile) */}
        {view === 'artist-onboarding' && (
          <form onSubmit={handleArtistOnboarding} className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">Almost there! Complete your artist profile.</p>
            
            <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Stage / Artist Name" value={artistName} onChange={e => setArtistName(e.target.value)} required maxLength={100} />
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Select Genre</label>
              <GenreSelect value={artistGenre} onValueChange={setArtistGenre} />
            </div>
            
            <Textarea
              placeholder="Short bio about yourself..."
              value={artistBio}
              onChange={e => setArtistBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            
            <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} type="tel" placeholder="Phone Number" value={artistPhone} onChange={e => setArtistPhone(e.target.value)} required maxLength={20} />
            
            <Input autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Address / Location" value={artistAddress} onChange={e => setArtistAddress(e.target.value)} maxLength={200} />
            
            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting || !artistGenre}>
              {isSubmitting ? 'Completing...' : 'Complete Registration'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
