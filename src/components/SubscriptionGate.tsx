import { Crown, Lock, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ArtistSubscription } from '@/lib/subscriptionService';

interface SubscriptionGateProps {
  subscription: ArtistSubscription | null;
  onSubscribe: () => void;
  onRefresh?: () => void;
  children: React.ReactNode;
}

const SubscriptionGate = ({ subscription, onSubscribe, onRefresh, children }: SubscriptionGateProps) => {
  const isActive = subscription?.status === 'active';

  if (isActive) return <>{children}</>;

  const isExpired = subscription?.status === 'expired';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        {isExpired ? (
          <ShieldAlert className="w-8 h-8 text-destructive" />
        ) : (
          <Lock className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-bold font-heading mb-2">
        {isExpired ? 'Subscription Expired' : 'Subscription Required'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {isExpired
          ? 'Your subscription has expired. All uploads and content management are locked until you renew. Your existing content is safe.'
          : 'You need an active storage plan to upload music, videos, reels, hero slides, and manage your content. Subscribe to get started.'}
      </p>
      <div className="flex items-center gap-3">
        <Button className="rounded-full px-8" onClick={onSubscribe}>
          <Crown className="w-4 h-4 mr-2" />
          {isExpired ? 'Renew Subscription' : 'Subscribe Now'}
        </Button>
        {onRefresh && (
          <Button variant="outline" size="icon" className="rounded-full" onClick={onRefresh} title="Refresh subscription status">
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
      {isExpired && (
        <p className="text-xs text-muted-foreground mt-4">
          Your storage data is preserved. Renewing will restore access to all your content.
        </p>
      )}
      {!subscription && (
        <p className="text-xs text-muted-foreground mt-4">
          Already subscribed? Tap refresh to check your subscription status.
        </p>
      )}
    </div>
  );
};

export default SubscriptionGate;
