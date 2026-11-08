import { siteOrigin } from '@/lib/siteUrl';
import { useEffect } from 'react';
import { getProxiedUrl } from '@/lib/mediaProxy';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'music.song' | 'video.other' | 'profile';
  keywords?: string[];
  artist?: string;
  duration?: string;
  genre?: string;
}

const DEFAULT_KEYWORDS = [
  'luo music',
  'acholi music', 
  'free download',
  'music videos',
  'african music',
  'upload songs',
  'promote music',
  'free music',
  'luo songs',
  'east african music'
];

export function useSEO({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords = [],
  artist,
  duration,
  genre,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper to update or create meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Helper to update or create link tag
    const setLinkTag = (rel: string, href: string, type?: string) => {
      let tag = document.querySelector(`link[rel="${rel}"]`);
      if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', rel);
        document.head.appendChild(tag);
      }
      tag.setAttribute('href', href);
      if (type) tag.setAttribute('type', type);
    };

    // Basic meta tags
    if (description) {
      setMetaTag('description', description);
    }

    // Keywords
    const allKeywords = [...DEFAULT_KEYWORDS, ...keywords];
    if (genre) allKeywords.push(genre);
    if (artist) allKeywords.push(artist);
    setMetaTag('keywords', allKeywords.join(', '));

    // Open Graph tags
    if (title) {
      setMetaTag('og:title', title, true);
    }
    if (description) {
      setMetaTag('og:description', description, true);
    }
    if (image) {
      const proxiedImage = getProxiedUrl(image);
      if (proxiedImage) {
        setMetaTag('og:image', proxiedImage, true);
        setMetaTag('twitter:image', proxiedImage);
      }
    }
    if (url) {
      setMetaTag('og:url', url, true);
      setLinkTag('canonical', url);
    }
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', 'LUO MUSIC STORE', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    if (title) {
      setMetaTag('twitter:title', title);
    }
    if (description) {
      setMetaTag('twitter:description', description);
    }

    // Music-specific meta tags
    if (type === 'music.song') {
      if (artist) {
        setMetaTag('music:musician', artist, true);
      }
      if (duration) {
        setMetaTag('music:duration', duration, true);
      }
      if (genre) {
        setMetaTag('music:genre', genre, true);
      }
    }

    // Video-specific meta tags
    if (type === 'video.other') {
      if (duration) {
        setMetaTag('video:duration', duration, true);
      }
    }

    // Dynamic favicon using cover image
    if (image) {
      const proxiedImage = getProxiedUrl(image);
      if (proxiedImage) {
        setLinkTag('icon', proxiedImage, 'image/png');
        setLinkTag('apple-touch-icon', proxiedImage);
      }
    }

    // Cleanup function to restore defaults
    return () => {
      document.title = 'LUO MUSIC STORE — Stream & Download Music';
      // Restore default favicon
      const faviconLink = document.querySelector('link[rel="icon"]');
      if (faviconLink) {
        faviconLink.setAttribute('href', '/logo.png');
      }
    };
  }, [title, description, image, url, type, keywords, artist, duration, genre]);
}

// JSON-LD structured data for songs
export function getMusicTrackJsonLd(track: {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  duration: string;
  genre?: string;
  coverURL?: string;
  audioURL?: string;
}) {
  const baseUrl = typeof window !== 'undefined' ? siteOrigin() : 'https://beat-creator-zone.lovable.app';
  const proxiedCover = track.coverURL ? getProxiedUrl(track.coverURL) : null;
  
  // Parse duration to ISO 8601 format
  const durationParts = track.duration.split(':');
  const minutes = parseInt(durationParts[0]) || 0;
  const seconds = parseInt(durationParts[1]) || 0;
  const isoDuration = `PT${minutes}M${seconds}S`;

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${baseUrl}/play/${track.id}`,
    name: track.title,
    url: `${baseUrl}/play/${track.id}`,
    duration: isoDuration,
    genre: track.genre || 'Luo Music',
    inLanguage: 'luo',
    ...(proxiedCover && { image: proxiedCover }),
    byArtist: {
      '@type': 'MusicGroup',
      name: track.artist,
      url: `${baseUrl}/artist/${track.artistId}`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Free Download',
    },
    potentialAction: {
      '@type': 'ListenAction',
      target: `${baseUrl}/play/${track.id}`,
    },
  };
}

// JSON-LD structured data for videos
export function getMusicVideoJsonLd(video: {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  duration: string;
  views?: string;
  genre?: string;
  thumbnailURL?: string;
  videoURL?: string;
}) {
  const baseUrl = typeof window !== 'undefined' ? siteOrigin() : 'https://beat-creator-zone.lovable.app';
  const proxiedThumbnail = video.thumbnailURL ? getProxiedUrl(video.thumbnailURL) : null;

  // Parse duration to ISO 8601 format
  const durationParts = video.duration.split(':');
  const minutes = parseInt(durationParts[0]) || 0;
  const seconds = parseInt(durationParts[1]) || 0;
  const isoDuration = `PT${minutes}M${seconds}S`;

  // Parse views to number (handle both string and number types)
  const viewCount = video.views ? parseInt(String(video.views).replace(/[^\d]/g, '')) || 0 : 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${baseUrl}/video/${video.id}`,
    name: video.title,
    description: `Watch ${video.title} by ${video.artist} - Free Download. Luo music video, Acholi music.`,
    url: `${baseUrl}/video/${video.id}`,
    duration: isoDuration,
    ...(proxiedThumbnail && { thumbnailUrl: proxiedThumbnail }),
    uploadDate: new Date().toISOString(),
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/WatchAction',
      userInteractionCount: viewCount,
    },
    creator: {
      '@type': 'MusicGroup',
      name: video.artist,
      url: `${baseUrl}/artist/${video.artistId}`,
    },
    genre: video.genre || 'Luo Music',
    inLanguage: 'luo',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Free Download',
    },
    potentialAction: {
      '@type': 'WatchAction',
      target: `${baseUrl}/video/${video.id}`,
    },
  };
}

// JSON-LD structured data for artists
export function getArtistJsonLd(artist: {
  id: string;
  name: string;
  genre: string;
  followers: string;
  bio: string;
  photoURL?: string;
}) {
  const baseUrl = typeof window !== 'undefined' ? siteOrigin() : 'https://beat-creator-zone.lovable.app';
  const proxiedPhoto = artist.photoURL ? getProxiedUrl(artist.photoURL) : null;

  // Parse followers to number
  const followerCount = artist.followers ? parseInt(String(artist.followers).replace(/[^\d]/g, '')) || 0 : 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${baseUrl}/artist/${artist.id}`,
    name: artist.name,
    description: artist.bio || `${artist.name} - ${artist.genre} artist on LUO MUSIC STORE. Free music downloads.`,
    url: `${baseUrl}/artist/${artist.id}`,
    genre: artist.genre,
    ...(proxiedPhoto && { image: proxiedPhoto }),
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: followerCount,
    },
  };
}

// Website JSON-LD for homepage
export function getWebsiteJsonLd() {
  const baseUrl = typeof window !== 'undefined' ? siteOrigin() : 'https://beat-creator-zone.lovable.app';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': baseUrl,
    name: 'LUO MUSIC STORE',
    url: baseUrl,
    description: 'Discover, stream, and download Luo and Acholi music from independent artists. Free music downloads, music videos, and artist promotion.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/browse?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    inLanguage: ['en', 'luo', 'ach'],
    keywords: DEFAULT_KEYWORDS.join(', '),
  };
}
