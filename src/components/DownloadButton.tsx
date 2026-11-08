import { useState, useEffect } from 'react';
import { Download, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getProxiedUrl } from '@/lib/mediaProxy';
import { isGoogleDriveUrl, getDriveDownloadUrl } from '@/lib/googleDrive';
import { toast } from '@/hooks/use-toast';

interface VideoQuality {
  id: string;
  quality: string;
  file_url: string;
  file_size_bytes: number;
  width: number;
  height: number;
  status: string;
}

interface DownloadButtonProps {
  url: string;
  filename: string;
  variant?: 'outline' | 'default';
  size?: 'sm' | 'default';
  className?: string;
  videoId?: string;
  durationSeconds?: number;
  originalFileSize?: number;
}

type DownloadState = 'idle' | 'loading' | 'downloading' | 'done' | 'error';

// Format bytes to human-readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const DownloadButton = ({ 
  url, 
  filename, 
  variant = 'outline', 
  size = 'sm', 
  className = '',
  videoId,
  durationSeconds = 0,
  originalFileSize = 0,
}: DownloadButtonProps) => {
  const [state, setState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<VideoQuality | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);

  // Derive an approximate download size from what we already know about the file
  useEffect(() => {
    if (!videoId || !url) return;
    setLoadingQuality(false);
    const estimated =
      originalFileSize > 0
        ? originalFileSize
        : durationSeconds > 0
          ? Math.round(durationSeconds * 350 * 1024) // ~2.8 Mbps average
          : 0;
    if (estimated > 0) {
      setQuality({
        id: videoId,
        quality: 'Original',
        file_url: url,
        file_size_bytes: estimated,
        width: 0,
        height: 0,
        status: 'ready',
      });
    }
  }, [videoId, url, durationSeconds, originalFileSize]);


  const downloadBlob = (blob: Blob, downloadFilename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async () => {
    if (state !== 'idle') return;
    
    const downloadUrl = quality?.file_url || url;
    if (!downloadUrl) {
      toast({ title: 'No file', description: 'No downloadable file available.', variant: 'destructive' });
      return;
    }

    // Google Drive blocks cross-origin fetches, so use its direct-download URL.
    if (isGoogleDriveUrl(downloadUrl)) {
      const driveUrl = getDriveDownloadUrl(downloadUrl);
      if (!driveUrl) {
        toast({ title: 'Invalid Google Drive link', variant: 'destructive' });
        return;
      }
      window.open(driveUrl, '_blank', 'noopener,noreferrer');
      setState('done');
      toast({ title: 'Download started', description: 'Opened the Google Drive download.' });
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    try {
      setState('downloading');
      setProgress(0);

      toast({ 
        title: 'Downloading...', 
        description: quality?.file_size_bytes 
          ? `File size: ${formatBytes(quality.file_size_bytes)}`
          : 'Starting download...'
      });

      const finalUrl = getProxiedUrl(downloadUrl);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', finalUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        } else {
          setProgress(prev => Math.min(prev + 1, 95));
        }
      };

      const blob = await new Promise<Blob>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response as Blob);
          } else {
            reject(new Error(`Download failed (HTTP ${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error - please try again'));
        xhr.ontimeout = () => reject(new Error('Download timed out'));
        xhr.timeout = 600000; // 10 minute timeout
        xhr.send();
      });

      setProgress(100);
      downloadBlob(blob, filename);
      
      setState('done');
      toast({ title: 'Download complete!', description: filename });

      setTimeout(() => { 
        setState('idle'); 
        setProgress(0); 
      }, 3000);
    } catch (err) {
      console.error('Download error:', err);
      setState('error');
      toast({ 
        title: 'Download failed', 
        description: err instanceof Error ? err.message : 'Could not download the file.', 
        variant: 'destructive' 
      });
      setTimeout(() => { 
        setState('idle'); 
        setProgress(0);
      }, 3000);
    }
  };

  const getLabel = () => {
    if (loadingQuality) return 'Loading...';
    if (state === 'downloading') return `${progress}%`;
    if (state === 'done') return 'Done';
    if (state === 'error') return 'Failed';
    
    // Show file size in button
    if (quality?.file_size_bytes) {
      return `Download (${formatBytes(quality.file_size_bytes)})`;
    }
    return 'Download';
  };

  const getIcon = () => {
    if (loadingQuality || state === 'downloading') {
      return (
        <motion.div
          className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      );
    }
    if (state === 'done') return <Check className="w-3.5 h-3.5" />;
    if (state === 'error') return <X className="w-3.5 h-3.5" />;
    return <Download className="w-3.5 h-3.5" />;
  };

  return (
    <div className="relative">
      <Button
        variant={state === 'done' ? 'default' : variant}
        size={size}
        className={`rounded-full gap-1.5 border-border overflow-hidden relative ${className}`}
        onClick={handleDownload}
        disabled={state !== 'idle' || loadingQuality}
      >
        {/* Progress background fill */}
        <AnimatePresence>
          {state === 'downloading' && (
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/20 rounded-full"
              transition={{ ease: 'linear', duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        <span className="relative z-10 flex items-center gap-1.5">
          {getIcon()}
          {getLabel()}
        </span>
      </Button>
    </div>
  );
};

export default DownloadButton;
