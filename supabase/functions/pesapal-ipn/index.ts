import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PESAPAL_BASE_URL = Deno.env.get('PESAPAL_ENV') === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cybqa.pesapal.com/pesapalv3';

// Helper to get Pesapal auth token
async function getPesapalToken(): Promise<string> {
  const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.token;
}

// Get transaction status from Pesapal
async function getTransactionStatus(orderTrackingId: string, token: string) {
  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse IPN parameters (GET or POST)
    let orderTrackingId: string;
    let orderMerchantReference: string;
    let orderNotificationType: string;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      orderTrackingId = url.searchParams.get('OrderTrackingId') || '';
      orderMerchantReference = url.searchParams.get('OrderMerchantReference') || '';
      orderNotificationType = url.searchParams.get('OrderNotificationType') || '';
    } else {
      const body = await req.json();
      orderTrackingId = body.OrderTrackingId || '';
      orderMerchantReference = body.OrderMerchantReference || '';
      orderNotificationType = body.OrderNotificationType || '';
    }

    console.log('[PesapalIPN] Received:', { orderTrackingId, orderMerchantReference, orderNotificationType });

    if (!orderTrackingId) {
      throw new Error('Missing OrderTrackingId');
    }

    // Get transaction status
    const token = await getPesapalToken();
    const status = await getTransactionStatus(orderTrackingId, token);
    
    console.log('[PesapalIPN] Transaction status:', JSON.stringify(status));

    // Parse the merchant reference to determine payment type
    // Format: {type}_{artistId}_{timestamp}
    // e.g., SUB_artist123_1234567890 or HERO_artist123_1234567890
    const [paymentType, artistId] = orderMerchantReference.split('_');
    
    const isCompleted = status.status_code === 1 || status.payment_status_description === 'Completed';
    
    console.log('[PesapalIPN] Payment result:', { 
      paymentType, 
      artistId, 
      isCompleted,
      statusCode: status.status_code,
      statusDesc: status.payment_status_description 
    });

    // Return response to Pesapal confirming receipt
    const responseData = {
      orderNotificationType,
      orderTrackingId,
      orderMerchantReference,
      status: 200,
      // Include additional data for frontend polling
      paymentStatus: isCompleted ? 'COMPLETED' : status.payment_status_description,
      paymentType,
      artistId,
      amount: status.amount,
      currency: status.currency,
      paymentMethod: status.payment_method,
      confirmationCode: status.confirmation_code,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PesapalIPN] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 500 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
