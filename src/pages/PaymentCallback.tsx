import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from '@/lib/router-compat';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference');
  const notificationType = searchParams.get('OrderNotificationType');
  const paymentType = searchParams.get('type');

  useEffect(() => {
    // The actual payment verification happens in the modal via polling
    // This page is just a landing page after Pesapal redirect
    if (orderTrackingId && notificationType === 'CALLBACKURL') {
      setStatus('success');
    } else if (notificationType) {
      setStatus('success');
    } else {
      // Just show loading briefly then success (modal handles actual verification)
      setTimeout(() => setStatus('success'), 1500);
    }
  }, [orderTrackingId, notificationType]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToDashboard = () => {
    navigate('/artist-dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Processing Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Complete!</h1>
            <p className="text-muted-foreground mb-6">
              Your payment has been processed. You can close this tab and return to the app.
            </p>
            {orderTrackingId && (
              <p className="text-xs text-muted-foreground mb-6">
                Reference: {orderMerchantReference || orderTrackingId}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleGoHome} className="rounded-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={handleGoToDashboard} className="rounded-full">
                Artist Dashboard
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
            <p className="text-muted-foreground mb-6">
              Something went wrong with your payment. Please try again.
            </p>
            <Button onClick={handleGoToDashboard} className="rounded-full">
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
