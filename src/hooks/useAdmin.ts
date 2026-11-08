import { useAuth } from '@/contexts/AuthContext';
import { isAdminEmail } from '@/lib/adminService';

export function useAdmin() {
  const { user, loading } = useAuth();
  
  const isAdmin = user?.email ? isAdminEmail(user.email) : false;
  
  return {
    isAdmin,
    loading,
    user,
  };
}
