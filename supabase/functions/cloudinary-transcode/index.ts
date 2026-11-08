import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLOUDINARY_CLOUD_NAME = 'djbmqus5d'

// R2 URL mapping: private S3 API URL to public development URL
const R2_PRIVATE_PATTERN = /https:\/\/luomusic\..*\.r2\.cloudflarestorage\.com/
const R2_PUBLIC_URL = 'https://pub-683bd5ef43fb4491b7655a9ef89354a3.r2.dev'

// Convert private R2 URL to public URL for Cloudinary access
function getPublicR2Url(url: string): string {
  return url.replace(R2_PRIVATE_PATTERN, R2_PUBLIC_URL)
}

// Quality presets
const QUALITY_PRESETS: Record<string, { width: number; height: number; cloudinaryParams: string }> = {
  '360p': { width: 640, height: 360, cloudinaryParams: 'c_limit,w_640,h_360,q_auto' },
  '480p': { width: 854, height: 480, cloudinaryParams: 'c_limit,w_854,h_480,q_auto' },
  '720p': { width: 1280, height: 720, cloudinaryParams: 'c_limit,w_1280,h_720,q_auto' },
  '1080p': { width: 1920, height: 1080, cloudinaryParams: 'c_limit,w_1920,h_1080,q_auto' },
}

// Generate SHA1 signature for Cloudinary API
async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  // Sort parameters alphabetically and create signature string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  const signatureString = sortedParams + apiSecret
  
  // Generate SHA1 hash
  const encoder = new TextEncoder()
  const data = encoder.encode(signatureString)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')
    const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')
    
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('[cloudinary-transcode] Missing Cloudinary credentials')
      return new Response(
        JSON.stringify({ error: 'Cloudinary credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, video_id, video_url, quality } = await req.json()
    console.log(`[cloudinary-transcode] Action: ${action}, Video ID: ${video_id}, Quality: ${quality}`)

    if (action === 'transcode') {
      if (!video_id || !video_url || !quality) {
        return new Response(
          JSON.stringify({ error: 'video_id, video_url, and quality are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const preset = QUALITY_PRESETS[quality]
      if (!preset) {
        return new Response(
          JSON.stringify({ error: `Invalid quality: ${quality}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get public R2 URL
      const publicUrl = getPublicR2Url(video_url)
      console.log(`[cloudinary-transcode] Public URL: ${publicUrl}`)

      // Update status to processing
      await supabase
        .from('video_qualities')
        .update({ status: 'processing' })
        .eq('video_id', video_id)
        .eq('quality', quality)

      // Prepare Cloudinary upload parameters
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const publicId = `videos/${video_id}_${quality}`
      const eager = `${preset.cloudinaryParams},f_mp4`
      const notificationUrl = `${supabaseUrl}/functions/v1/cloudinary-webhook`
      
      // All parameters that will be sent must be included in signature (except api_key, file, resource_type, signature)
      const params: Record<string, string> = {
        eager: eager,
        eager_async: 'true',
        notification_url: notificationUrl,
        public_id: publicId,
        timestamp: timestamp,
        type: 'upload',
      }

      const signature = await generateSignature(params, CLOUDINARY_API_SECRET)

      // Upload video to Cloudinary with eager transformation
      const formData = new FormData()
      formData.append('file', publicUrl)
      formData.append('api_key', CLOUDINARY_API_KEY)
      formData.append('timestamp', timestamp)
      formData.append('signature', signature)
      formData.append('public_id', publicId)
      formData.append('type', 'upload')
      formData.append('eager', eager)
      formData.append('eager_async', 'true')
      formData.append('resource_type', 'video')
      formData.append('notification_url', notificationUrl)

      console.log(`[cloudinary-transcode] Uploading to Cloudinary with eager: ${eager}`)

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      )

      const uploadResult = await uploadResponse.json()
      console.log(`[cloudinary-transcode] Upload response:`, JSON.stringify(uploadResult))

      if (uploadResult.error) {
        console.error('[cloudinary-transcode] Cloudinary error:', uploadResult.error)
        await supabase
          .from('video_qualities')
          .update({ status: 'error' })
          .eq('video_id', video_id)
          .eq('quality', quality)
        
        return new Response(
          JSON.stringify({ error: uploadResult.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if eager transformation is already complete
      if (uploadResult.eager && uploadResult.eager[0]) {
        const eagerResult = uploadResult.eager[0]
        const transcodedUrl = eagerResult.secure_url
        const fileSize = eagerResult.bytes || 0

        console.log(`[cloudinary-transcode] Eager complete: ${transcodedUrl}, size: ${fileSize}`)

        await supabase
          .from('video_qualities')
          .update({ 
            file_url: transcodedUrl,
            file_size_bytes: fileSize,
            status: 'completed'
          })
          .eq('video_id', video_id)
          .eq('quality', quality)

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'completed',
            url: transcodedUrl,
            size: fileSize
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Transformation is processing asynchronously
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'processing',
          message: 'Video is being transcoded. Check back shortly.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'check_status') {
      if (!video_id || !quality) {
        return new Response(
          JSON.stringify({ error: 'video_id and quality are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('video_qualities')
        .select('*')
        .eq('video_id', video_id)
        .eq('quality', quality)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          status: data?.status || 'unknown',
          url: data?.file_url,
          size: data?.file_size_bytes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "transcode" or "check_status"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[cloudinary-transcode] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
