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
    const { 
      token,
      merchantReference,
      amount,
      currency = 'UGX',
      description,
      phoneNumber,
      email,
      firstName,
      lastName,
      callbackUrl,
      cancellationUrl,
      notificationId,
      paymentType, // 'subscription' or 'hero_slide'
      metadata // Additional data to track
    } = await req.json();

    if (!token || !merchantReference || !amount) {
      throw new Error('Missing required fields: token, merchantReference, amount');
    }

    console.log('[PesapalSubmitOrder] Creating order:', { merchantReference, amount, currency, paymentType });

    const orderPayload = {
      id: merchantReference,
      currency,
      amount: parseFloat(amount),
      description: description || `Payment for ${paymentType}`,
      callback_url: callbackUrl,
      cancellation_url: cancellationUrl,
      notification_id: notificationId,
      billing_address: {
        phone_number: phoneNumber || '',
        email_address: email || '',
        first_name: firstName || '',
        last_name: lastName || '',
        country_code: 'UG',
      },
    };

    console.log('[PesapalSubmitOrder] Payload:', JSON.stringify(orderPayload));

    const response = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();
    console.log('[PesapalSubmitOrder] Response:', JSON.stringify(data));

    if (data.error) {
      console.error('[PesapalSubmitOrder] Error:', data.error);
      throw new Error(data.error.message || 'Order submission failed');
    }

    return new Response(JSON.stringify({
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference,
      redirectUrl: data.redirect_url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PesapalSubmitOrder] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
