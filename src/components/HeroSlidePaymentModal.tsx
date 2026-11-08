import { siteOrigin } from '@/lib/siteUrl';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, CheckCircle2, Crown, Image, Loader2 } from 'lucide-react';
import { HERO_SLIDE_PLANS, formatUGX, type HeroSlidePlan } from '@/lib/heroSlideService';
import { toast } from '@/hooks/use-toast';
import { addHeroSlide } from '@/lib/firebaseServices';
import { purchaseHeroSlide } from '@/lib/heroSlideService';
import {
  getPesapalToken,
  submitPesapalOrder,
  getOrCreateIpnId,
  generateMerchantReference,
  pollPaymentStatus,
} from '@/lib/pesapalService';

export interface HeroSlideData {
  title: string;
  subtitle?: string;
  artist: string;
  artistId: string;
  badge: string;
  imageFile?: File;
  linkedContentId?: string;
  linkedContentType?: 'track' | 'video';
  ctaText?: string;
}

interface HeroSlidePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideData: HeroSlideData | null;
  onSuccess: () => void;
}

const HeroSlidePaymentModal = ({
  open,
  onOpenChange,
  slideData,
  onSuccess,
}: HeroSlidePaymentModalProps) => {
  const [step, setStep] = useState<'payment' | 'processing' | 'redirect' | 'confirming' | 'uploading' | 'confirm'>('payment');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(HERO_SLIDE_PLANS[0].id);

  const plan = HERO_SLIDE_PLANS.find(p => p.id === selectedPlanId) || HERO_SLIDE_PLANS[0];

  const handleInitiatePayment = async () => {
    if (!phoneNumber.trim() || !slideData) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    setStep('processing');
    
    try {
      // Get Pesapal token
      const tokenData = await getPesapalToken();
      console.log('[HeroSlide] Got Pesapal token');

      // Get or create IPN ID
      const ipnId = await getOrCreateIpnId();
      console.log('[HeroSlide] IPN ID:', ipnId);

      // Generate merchant reference
      const merchantRef = generateMerchantReference('HERO', slideData.artistId);

      // Get callback URL
      const baseUrl = siteOrigin();
      const callbackUrl = `${baseUrl}/payment-callback?type=hero_slide&artistId=${slideData.artistId}`;

      // Submit order to Pesapal
      const order = await submitPesapalOrder({
        token: tokenData.token,
        merchantReference: merchantRef,
        amount: plan.priceUGX,
        currency: 'UGX',
        description: `Hero Slide - ${plan.name}`,
        phoneNumber: phoneNumber.trim(),
        callbackUrl,
        notificationId: ipnId,
        paymentType: 'hero_slide',
      });

      console.log('[HeroSlide] Order created:', order);

      setOrderTrackingId(order.orderTrackingId);
      setRedirectUrl(order.redirectUrl);
      setStep('redirect');

    } catch (err: any) {
      console.error('[HeroSlide] Payment initiation failed:', err);
      toast({ 
        title: 'Payment Failed', 
        description: err.message || 'Could not initiate payment', 
        variant: 'destructive' 
      });
      setStep('payment');
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
    if (!orderTrackingId || !slideData) return;

    try {
      await pollPaymentStatus(orderTrackingId);

      // Payment confirmed - now upload the slide
      setStep('uploading');

      const slideId = await addHeroSlide({
        title: slideData.title,
        subtitle: slideData.subtitle,
        artist: slideData.artist,
        artistId: slideData.artistId,
        badge: slideData.badge,
        imageFile: slideData.imageFile,
        linkedContentId: slideData.linkedContentId,
        linkedContentType: slideData.linkedContentType,
        ctaText: slideData.ctaText,
      });

      // Activate the slide with expiration
      await purchaseHeroSlide(slideData.artistId, slideId, plan.id, phoneNumber.trim());
      
      setStep('confirm');
      toast({ 
        title: 'Hero slide activated!', 
        description: `Your slide will be featured for ${plan.durationDays} day.` 
      });
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error('[HeroSlide] Payment/upload failed:', err);
      toast({ 
        title: 'Failed', 
        description: err.message || 'Payment was not completed', 
        variant: 'destructive' 
      });
      setStep('payment');
    }
  };

  const resetForm = () => {
    setStep('payment');
    setPhoneNumber('');
    setRedirectUrl(null);
    setOrderTrackingId(null);
    setSelectedPlanId(HERO_SLIDE_PLANS[0].id);
  };

  const handleClose = () => {
    if (step === 'processing' || step === 'confirming' || step === 'uploading') return;
    resetForm();
    onOpenChange(false);
  };

  if (!slideData) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${step === 'confirming' ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Pay for Hero Slide
          </DialogTitle>
        </DialogHeader>

        {step === 'payment' && (
          <div className="space-y-4">
            {/* Slide preview */}
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Image className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slideData.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{slideData.subtitle || slideData.badge}</p>
                </div>
              </div>
            </div>

            {/* Plan selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose Duration</p>
              {HERO_SLIDE_PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    selectedPlanId === p.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border bg-secondary/30 hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className={`text-sm font-bold ${selectedPlanId === p.id ? 'text-primary' : 'text-foreground'}`}>
                      {formatUGX(p.priceUGX)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>

            {/* Phone input */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> Your Phone Number
              </p>
              <Input
                placeholder="e.g. 0770123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={15}
                type="tel"
                className="text-center text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Pesapal to complete payment.
              </p>
            </div>

            <Button
              className="rounded-full w-full"
              onClick={handleInitiatePayment}
              disabled={processing || !phoneNumber.trim()}
            >
              Continue to Payment - {formatUGX(plan.priceUGX)}
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-sm font-medium mb-1">Setting up payment...</h3>
            <p className="text-xs text-muted-foreground">Please wait</p>
          </div>
        )}

        {step === 'redirect' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{plan.name} Hero Slide</span>
                <span className="text-sm font-bold text-primary">{formatUGX(plan.priceUGX)}</span>
              </div>
            </div>

            <Button
              className="rounded-full w-full"
              onClick={handleProceedToPayment}
            >
              <Crown className="w-5 h-5 mr-2" />
              Pay Now
            </Button>
          </div>
        )}

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

        {step === 'uploading' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-sm font-medium mb-1">Uploading Hero Slide...</h3>
            <p className="text-xs text-muted-foreground">
              Payment confirmed! Uploading your slide now.
            </p>
          </div>
        )}

        {step === 'confirm' && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Hero Slide Live!</h3>
            <p className="text-sm text-muted-foreground">
              Your hero slide is now featured for {plan.durationDays} day.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HeroSlidePaymentModal;
