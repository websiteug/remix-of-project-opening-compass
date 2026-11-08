import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// R2 URL mapping: private S3 API URL to public development URL
const R2_PRIVATE_PATTERN = /https:\/\/luomusic\..*\.r2\.cloudflarestorage\.com/
const R2_PUBLIC_URL = 'https://pub-683bd5ef43fb4491b7655a9ef89354a3.r2.dev'

function getPublicR2Url(url: string): string {
  return url.replace(R2_PRIVATE_PATTERN, R2_PUBLIC_URL)
}

const ORIGINAL_MB_PER_MINUTE = 60

interface VideoQuality {
  video_id: string
  quality: string
  file_url: string
  file_size_bytes: number
  width: number
  height: number
  bitrate: number
  status: string
}

function calculateFileSizeFromMbPerMinute(durationSeconds: number, mbPerMinute: number): number {
  const durationMinutes = durationSeconds / 60
  return Math.round(mbPerMinute * durationMinutes * 1024 * 1024)
}

async function getFileSize(url: string): Promise<number> {
  try {
    const headResponse = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (headResponse.ok) {
      const contentLength = headResponse.headers.get('content-length')
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (size > 100000) return size
      }
    }
    const rangeResponse = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      redirect: 'follow',
    })
    const contentRange = rangeResponse.headers.get('content-range')
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/)
      if (match) {
        const size = parseInt(match[1], 10)
        if (size > 100000) return size
      }
    }
    return 0
  } catch {
    return 0
  }
}

async function getBestFileSize(url: string): Promise<number> {
  const candidates = [url]
  const publicUrl = getPublicR2Url(url)
  if (publicUrl !== url) candidates.push(publicUrl)
  for (const candidate of candidates) {
    const size = await getFileSize(candidate)
    if (size > 100000) return size
  }
  return 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, video_id, video_url, duration_seconds, original_file_size } = await req.json()
    console.log(`[video-qualities] Action: ${action}, Video ID: ${video_id}`)

    if (action === 'calculate' || action === 'refresh') {
      if (!video_id || !video_url) {
        return new Response(
          JSON.stringify({ error: 'video_id and video_url are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete existing for refresh
      if (action === 'refresh') {
        await supabase.from('video_qualities').delete().eq('video_id', video_id)
      }

      let originalSize = original_file_size || 0
      if (!originalSize) {
        originalSize = await getBestFileSize(video_url)
      }
      
      const duration = duration_seconds || 240
      if (!originalSize || originalSize < 100000) {
        originalSize = calculateFileSizeFromMbPerMinute(duration, ORIGINAL_MB_PER_MINUTE)
      }

      const originalBitrate = duration > 0 ? (originalSize * 8) / (duration * 1000) : 8000
      const publicVideoUrl = getPublicR2Url(video_url)

      // Only provide original quality - no fake quality options
      // Real transcoding requires paid services or self-hosting
      const qualities: VideoQuality[] = [{
        video_id,
        quality: 'original',
        file_url: publicVideoUrl,
        file_size_bytes: originalSize,
        width: 1920,
        height: 1080,
        bitrate: Math.round(originalBitrate),
        status: 'completed',
      }]

      const { data, error } = await supabase
        .from('video_qualities')
        .upsert(qualities, { onConflict: 'video_id,quality' })
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, qualities: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get') {
      if (!video_id) {
        return new Response(
          JSON.stringify({ error: 'video_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('video_qualities')
        .select('*')
        .eq('video_id', video_id)
        .eq('status', 'completed')
        .order('file_size_bytes', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ qualities: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "calculate", "get", or "refresh"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[video-qualities] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
