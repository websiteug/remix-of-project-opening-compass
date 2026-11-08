-- Create table for video quality versions
CREATE TABLE public.video_qualities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  quality TEXT NOT NULL CHECK (quality IN ('360p', '480p', '720p', '1080p', 'original')),
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  bitrate INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, quality)
);

-- Enable Row Level Security
ALTER TABLE public.video_qualities ENABLE ROW LEVEL SECURITY;

-- Allow public read access (videos are public)
CREATE POLICY "Video qualities are publicly readable"
ON public.video_qualities
FOR SELECT
USING (true);

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service role can insert video qualities"
ON public.video_qualities
FOR INSERT
WITH CHECK (true);

-- Allow updates from edge functions (service role)
CREATE POLICY "Service role can update video qualities"
ON public.video_qualities
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_video_qualities_video_id ON public.video_qualities(video_id);
CREATE INDEX idx_video_qualities_status ON public.video_qualities(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_video_qualities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_qualities_updated_at
BEFORE UPDATE ON public.video_qualities
FOR EACH ROW
EXECUTE FUNCTION public.update_video_qualities_updated_at();