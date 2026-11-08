import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use sandbox for testing, switch to production when ready
const PESAPAL_BASE_URL = Deno.env.get('PESAPAL_ENV') === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cybqa.pesapal.com/pesapalv3';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      console.error('[PesapalAuth] Missing credentials');
      throw new Error('Pesapal credentials not configured');
    }

    console.log('[PesapalAuth] Requesting token from:', `${PESAPAL_BASE_URL}/api/Auth/RequestToken`);

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
    console.log('[PesapalAuth] Response status:', data.status, 'Error:', JSON.stringify(data.error));

    if (data.error) {
      console.error('[PesapalAuth] Error:', JSON.stringify(data.error));
      const errorMsg = data.error.code === 'invalid_consumer_key_or_secret_provided' 
        ? 'Invalid Pesapal credentials. Please check your consumer key and secret match the environment (sandbox vs production).'
        : (data.error.message || 'Authentication failed');
      throw new Error(errorMsg);
    }

    return new Response(JSON.stringify({
      token: data.token,
      expiryDate: data.expiryDate,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PesapalAuth] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
