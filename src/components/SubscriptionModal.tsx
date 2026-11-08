import { siteOrigin } from '@/lib/siteUrl';
import { useState, useEffect } from 'react';
import { Crown, HardDrive, Phone, ArrowLeft, Smartphone, Loader2, CheckCircle2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SUBSCRIPTION_PLANS, subscribePlan, formatUGX,
  type SubscriptionPlan,
} from '@/lib/subscriptionService';
import {
  getPesapalToken,
  submitPesapalOrder,
  getOrCreateIpnId,
  generateMerchantReference,
  pollPaymentStatus,
} from '@/lib/pesapalService';
import { toast } from '@/hooks/use-toast';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  currentPlanId?: string;
  onSubscribed?: () => Promise<void> | void;
}

type Step = 'select-plan' | 'payment-details' | 'processing' | 'redirect' | 'confirming' | 'success';

const SubscriptionModal = ({ open, onOpenChange, artistId, currentPlanId, onSubscribed }: SubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<Step>('select-plan');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setStep('payment-details');
  };

  const handleBack = () => {
    if (step === 'payment-details') setStep('select-plan');
  };

  const handleInitiatePayment = async () => {
    if (!selectedPlan || !phoneNumber.trim()) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' });
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    setProcessing(true);
    setStep('processing');

    try {
      // Get Pesapal token
      const tokenData = await getPesapalToken();
      console.log('[Subscription] Got Pesapal token');

      // Get or create IPN ID
      const ipnId = await getOrCreateIpnId();
      console.log('[Subscription] IPN ID:', ipnId);

      // Generate merchant reference
      const merchantRef = generateMerchantReference('SUB', artistId);

      // Get callback URL (current origin + callback route)
      const baseUrl = siteOrigin();
      const callbackUrl = `${baseUrl}/payment-callback?type=subscription&artistId=${artistId}&planId=${plan.id}&phone=${encodeURIComponent(phoneNumber)}`;

      // Submit order to Pesapal
      const order = await submitPesapalOrder({
        token: tokenData.token,
        merchantReference: merchantRef,
        amount: plan.priceUGX,
        currency: 'UGX',
        description: `${plan.name} Storage Subscription`,
        phoneNumber: phoneNumber.trim(),
        callbackUrl,
        notificationId: ipnId,
        paymentType: 'subscription',
      });

      console.log('[Subscription] Order created:', order);

      setOrderTrackingId(order.orderTrackingId);
      setRedirectUrl(order.redirectUrl);
      setStep('redirect');

    } catch (err: any) {
      console.error('[Subscription] Payment initiation failed:', err);
      toast({ 
        title: 'Payment Failed', 
        description: err.message || 'Could not initiate payment', 
        variant: 'destructive' 
      });
      setStep('payment-details');
    }

    setProcessing(false);
  };

  const handleProceedToPayment = () => {
    if (redirectUrl) {
      setStep('confirming');
      startPolling();
    }
  };

  const startPolling = async () => {
    if (!orderTrackingId || !selectedPlan) return;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    try {
      await pollPaymentStatus(orderTrackingId);

      // Payment confirmed - activate subscription
      await subscribePlan(
        artistId,
        plan.id,
        orderTrackingId,
        'pesapal',
        phoneNumber.trim(),
      );

      setStep('success');
      toast({
        title: '✅ Subscription Activated!',
        description: `${plan.storageGB} GB plan is now active.`,
      });

      if (onSubscribed) {
        await onSubscribed();
      }

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error('[Subscription] Payment confirmation failed:', err);
      toast({ 
        title: 'Payment Not Confirmed', 
        description: err.message || 'Payment was not completed', 
        variant: 'destructive' 
      });
      setStep('payment-details');
    }
  };

  const resetForm = () => {
    setStep('select-plan');
    setSelectedPlan(null);
    setPhoneNumber('');
    setRedirectUrl(null);
    setOrderTrackingId(null);
  };

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);

  return (
    <Dialog open={open} onOpenChange={(v) => { 
      if (!v && step !== 'processing' && step !== 'confirming') {
        resetForm(); 
        onOpenChange(v); 
      }
    }}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${step === 'confirming' ? 'max-w-2xl' : 'max-w-md'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {step === 'payment-details' && (
              <button onClick={handleBack} className="p-1 rounded-full hover:bg-secondary transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Crown className="w-5 h-5 text-primary" />
            {step === 'select-plan' && 'Choose Storage Plan'}
            {step === 'payment-details' && 'Enter Phone Number'}
            {step === 'processing' && 'Processing...'}
            {step === 'redirect' && 'Complete Payment'}
            {step === 'confirming' && 'Confirming Payment...'}
            {step === 'success' && 'Success!'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Plan */}
        {step === 'select-plan' && (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Subscribe to upload music, videos, hero slides, and reels.
            </p>
            {SUBSCRIPTION_PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPlan(p.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  currentPlanId === p.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.storageGB} GB</span>
                    {currentPlanId === p.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">30 days • {p.storageGB} GB storage</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold">{formatUGX(p.priceUGX)}</p>
                  <p className="text-[10px] text-muted-foreground">/month</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 'payment-details' && plan && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{plan.name}</span>
                <span className="text-sm font-bold text-primary">{formatUGX(plan.priceUGX)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Enter your phone number</p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Pesapal to complete payment
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <Input
                placeholder="e.g. 0770123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={15}
                type="tel"
                className="text-center text-lg font-mono"
              />
            </div>

            <Button
              className="rounded-full w-full h-12 text-base"
              onClick={handleInitiatePayment}
              disabled={processing || !phoneNumber.trim()}
            >
              <Crown className="w-5 h-5 mr-2" />
              Continue to Payment - {formatUGX(plan.priceUGX)}
            </Button>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-sm font-medium mb-1">Setting up payment...</h3>
            <p className="text-xs text-muted-foreground">Please wait</p>
          </div>
        )}

        {/* Step 4: Ready to Pay */}
        {step === 'redirect' && plan && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{plan.name}</span>
                <span className="text-sm font-bold text-primary">{formatUGX(plan.priceUGX)}</span>
              </div>
            </div>

            <Button
              className="rounded-full w-full h-12 text-base"
              onClick={handleProceedToPayment}
            >
              <Crown className="w-5 h-5 mr-2" />
              Subscribe
            </Button>
          </div>
        )}

        {/* Step 5: Embedded Pesapal Payment */}
        {step === 'confirming' && redirectUrl && (
          <div className="space-y-3">
            <div className="relative w-full rounded-lg overflow-hidden border border-border bg-background" style={{ height: '500px' }}>
              <iframe
                src={redirectUrl}
                className="w-full h-full"
                title="Pesapal Payment"
                allow="payment"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for payment confirmation...</span>
            </div>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 'success' && plan && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Subscription Active!</h3>
            <p className="text-sm text-muted-foreground">
              Your {plan.storageGB} GB plan is now active for 30 days.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
