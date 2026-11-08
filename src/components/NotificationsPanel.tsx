import { useState, useEffect } from 'react';
import { Bell, X, Check, Heart, MessageCircle, UserPlus, Upload, Info } from 'lucide-react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type NotificationDoc } from '@/lib/firebaseServices';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@/lib/router-compat';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  upload: Upload,
  system: Info,
};

const NotificationsPanel = ({ open, onClose, onCountChange }: NotificationsPanelProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const n = await fetchNotifications(user.uid);
    // Sort by createdAt descending
    n.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
    setNotifications(n);
    onCountChange?.(n.filter(x => !x.read).length);
    setLoading(false);
  };

  useEffect(() => {
    if (open && user) load();
  }, [open, user]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onCountChange?.(notifications.filter(x => !x.read && x.id !== id).length);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange?.(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute top-16 right-4 w-80 max-h-[70vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm font-heading">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <Bell className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}

          {!loading && notifications.map(n => {
            const Icon = iconMap[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-primary/10' : 'bg-secondary'}`}>
                  <Icon className={`w-4 h-4 ${!n.read ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${!n.read ? 'font-semibold' : 'text-muted-foreground'}`}>{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
