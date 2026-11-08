import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log('[cloudinary-webhook] Received notification:', JSON.stringify(payload))

    // Extract video_id and quality from public_id (format: videos/{video_id}_{quality})
    const publicId = payload.public_id
    if (!publicId || !publicId.startsWith('videos/')) {
      console.log('[cloudinary-webhook] Ignoring non-video notification')
      return new Response('ok', { headers: corsHeaders })
    }

    const parts = publicId.replace('videos/', '').split('_')
    const quality = parts.pop()
    const video_id = parts.join('_')

    console.log(`[cloudinary-webhook] Video ID: ${video_id}, Quality: ${quality}`)

    // Check if this is an eager transformation completion
    if (payload.eager && payload.eager.length > 0) {
      const eagerResult = payload.eager[0]
      const transcodedUrl = eagerResult.secure_url
      const fileSize = eagerResult.bytes || 0

      console.log(`[cloudinary-webhook] Eager complete: ${transcodedUrl}, size: ${fileSize}`)

      const { error } = await supabase
        .from('video_qualities')
        .update({ 
          file_url: transcodedUrl,
          file_size_bytes: fileSize,
          status: 'completed'
        })
        .eq('video_id', video_id)
        .eq('quality', quality)

      if (error) {
        console.error('[cloudinary-webhook] Update error:', error)
      }
    } else if (payload.notification_type === 'error') {
      console.error('[cloudinary-webhook] Transformation error:', payload.error)
      
      await supabase
        .from('video_qualities')
        .update({ status: 'error' })
        .eq('video_id', video_id)
        .eq('quality', quality)
    }

    return new Response('ok', { headers: corsHeaders })
  } catch (error) {
    console.error('[cloudinary-webhook] Error:', error)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
