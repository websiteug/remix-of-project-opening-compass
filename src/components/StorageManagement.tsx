import { useState, useEffect } from 'react';
import { HardDrive, Clock, AlertTriangle, Crown, ArrowUpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  fetchArtistSubscription,
  formatBytes,
  formatUGX,
  getExpiryDate,
  getDaysRemaining,
  SUBSCRIPTION_PLANS,
  type ArtistSubscription,
} from '@/lib/subscriptionService';
import SubscriptionModal from './SubscriptionModal';

interface StorageManagementProps {
  artistId: string;
}

const StorageManagement = ({ artistId }: StorageManagementProps) => {
  const [subscription, setSubscription] = useState<ArtistSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subModalOpen, setSubModalOpen] = useState(false);

  const loadSubscription = async () => {
    setLoading(true);
    const sub = await fetchArtistSubscription(artistId);
    setSubscription(sub);
    setLoading(false);
  };

  useEffect(() => {
    if (artistId) loadSubscription();
  }, [artistId]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const isActive = subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired';
  const hasNoPlan = !subscription || subscription.status === 'none';

  const totalBytes = (subscription?.storageGB || 0) * 1024 * 1024 * 1024;
  const usedBytes = subscription?.storageUsedBytes || 0;
  const usagePercent = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;
  const remainingBytes = Math.max(0, totalBytes - usedBytes);
  const daysRemaining = getDaysRemaining(subscription);
  const expiryDate = getExpiryDate(subscription);
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription?.planId);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-xl border ${
        isActive ? 'bg-green-500/5 border-green-500/20' :
        isExpired ? 'bg-destructive/5 border-destructive/20' :
        'bg-muted border-border'
      }`}>
        <div className="flex items-center gap-3">
          {isActive && <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />}
          {isExpired && <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />}
          {hasNoPlan && <AlertTriangle className="w-6 h-6 text-muted-foreground flex-shrink-0" />}
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              {isActive && 'Subscription Active'}
              {isExpired && 'Subscription Expired'}
              {hasNoPlan && 'No Active Subscription'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isActive && currentPlan && `${currentPlan.name} — ${daysRemaining} days remaining`}
              {isExpired && 'Your uploads are locked. Subscribe to unlock your content and upload new files.'}
              {hasNoPlan && 'Subscribe to a storage plan to start uploading music, videos, and more.'}
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-full flex-shrink-0"
            onClick={() => setSubModalOpen(true)}
          >
            <Crown className="w-3.5 h-3.5 mr-1" />
            {hasNoPlan ? 'Subscribe' : isExpired ? 'Renew' : 'Upgrade'}
          </Button>
        </div>
      </div>

      {/* Storage Usage */}
      {(isActive || isExpired) && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-primary" /> Storage Usage
          </h3>

          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Used: <strong className="text-foreground">{formatBytes(usedBytes)}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-foreground">{subscription?.storageGB} GB</strong></span>
            </div>
            <Progress value={usagePercent} className="h-3" />
            <p className="text-[11px] text-muted-foreground mt-1">{usagePercent.toFixed(1)}% used • {formatBytes(remainingBytes)} remaining</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <HardDrive className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{formatBytes(usedBytes)}</p>
              <p className="text-[10px] text-muted-foreground">Used</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <ArrowUpCircle className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{formatBytes(remainingBytes)}</p>
              <p className="text-[10px] text-muted-foreground">Remaining</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{daysRemaining} days</p>
              <p className="text-[10px] text-muted-foreground">Until Expiry</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <Crown className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{currentPlan?.storageGB || 0} GB</p>
              <p className="text-[10px] text-muted-foreground">Plan</p>
            </div>
          </div>

          {expiryDate && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Expires on: {expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Upgrade Section */}
      {isActive && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ArrowUpCircle className="w-4 h-4 text-primary" /> Available Plans
          </h3>
          <div className="space-y-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  plan.id === subscription?.planId
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-primary/20'
                }`}
              >
                <HardDrive className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{plan.storageGB} GB</span>
                  {plan.id === subscription?.planId && (
                    <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Active</span>
                  )}
                </div>
                <span className="text-sm font-bold">{formatUGX(plan.priceUGX)}</span>
              </div>
            ))}
          </div>
          <Button className="rounded-full w-full mt-4" onClick={() => setSubModalOpen(true)}>
            <ArrowUpCircle className="w-4 h-4 mr-1.5" /> Change Plan
          </Button>
        </div>
      )}

      <SubscriptionModal
        open={subModalOpen}
        onOpenChange={setSubModalOpen}
        artistId={artistId}
        currentPlanId={subscription?.planId}
        onSubscribed={loadSubscription}
      />
    </div>
  );
};

export default StorageManagement;
