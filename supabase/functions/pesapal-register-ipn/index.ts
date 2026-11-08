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
    const { token, ipnUrl } = await req.json();

    if (!token || !ipnUrl) {
      throw new Error('Missing required fields: token, ipnUrl');
    }

    console.log('[PesapalRegisterIPN] Registering IPN URL:', ipnUrl);

    const response = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'GET',
      }),
    });

    const data = await response.json();
    console.log('[PesapalRegisterIPN] Response:', JSON.stringify(data));

    if (data.error) {
      throw new Error(data.error.message || 'IPN registration failed');
    }

    return new Response(JSON.stringify({
      ipnId: data.ipn_id,
      url: data.url,
      status: data.ipn_status_description,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PesapalRegisterIPN] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
