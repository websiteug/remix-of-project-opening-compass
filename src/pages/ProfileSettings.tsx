import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, LogOut } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { uploadFile } from '@/lib/firebaseServices';
import { toast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, profile, updateUserProfile, logOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
        <Button variant="outline" className="rounded-full" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(`profiles/${user.uid}`, file);
      await updateUserProfile({ photoURL: url });
      await refreshProfile();
      toast({ title: 'Photo updated!' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile({ name });
    await refreshProfile();
    toast({ title: 'Profile updated!' });
    setSaving(false);
  };

  const handleLogout = async () => {
    await logOut();
    navigate('/');
  };

  const avatarSrc = getProxiedUrl(profile.photoURL);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
      </button>

      <h1 className="text-xl font-bold font-heading mb-6">Profile Settings</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="relative">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground"
              style={{ background: profile.gradientFrom ? `linear-gradient(135deg, ${profile.gradientFrom}, ${profile.gradientTo})` : 'hsl(var(--primary))' }}
            >
              {(profile.name || user.email || '?')[0].toUpperCase()}
            </div>
          )}
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-primary-foreground" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      {/* Name */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Role</label>
          <div className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground capitalize">
            {profile.role || 'listener'}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Logout */}
      <div className="mt-10 pt-6 border-t border-border">
        <Button variant="outline" onClick={handleLogout} className="w-full rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
};

export default ProfileSettings;
