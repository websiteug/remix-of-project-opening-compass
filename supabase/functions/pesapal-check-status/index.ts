import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PESAPAL_BASE_URL = Deno.env.get('PESAPAL_ENV') === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cybqa.pesapal.com/pesapalv3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, orderTrackingId } = await req.json();

    if (!token || !orderTrackingId) {
      throw new Error('Missing required fields: token, orderTrackingId');
    }

    console.log('[PesapalCheckStatus] Checking:', orderTrackingId);

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

    const data = await response.json();
    console.log('[PesapalCheckStatus] Response:', JSON.stringify(data));

    // Handle "Pending Payment" as a valid PENDING state, not an error
    // This happens while the user is still completing payment in the iframe
    if (data.error && data.error.code === 'payment_details_not_found') {
      console.log('[PesapalCheckStatus] Payment pending - user still completing payment');
      return new Response(JSON.stringify({
        status: 'PENDING',
        statusCode: null,
        amount: data.amount,
        currency: data.currency,
        message: 'Payment pending',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle other actual errors
    if (data.error && data.error.code && data.error.code !== 'payment_details_not_found') {
      throw new Error(data.error.message || 'Status check failed');
    }

    // Map Pesapal status codes
    // 0 - INVALID, 1 - COMPLETED, 2 - FAILED, 3 - REVERSED
    const statusMap: Record<number, string> = {
      0: 'INVALID',
      1: 'COMPLETED',
      2: 'FAILED',
      3: 'REVERSED',
    };

    return new Response(JSON.stringify({
      status: statusMap[data.status_code] || data.payment_status_description || 'PENDING',
      statusCode: data.status_code,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.payment_method,
      confirmationCode: data.confirmation_code,
      merchantReference: data.merchant_reference,
      description: data.description,
      message: data.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PesapalCheckStatus] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
