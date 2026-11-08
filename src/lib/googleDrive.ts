// Helpers for handling Google Drive share links used as media sources.
// Drive blocks direct playback in our own <audio>/<video> element, so Drive
// content is rendered inside Google's own preview player instead.

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com', 'drive.usercontent.google.com'];

/** True when the URL points at Google Drive. */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return DRIVE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Extracts the Drive file id from any of the common share link shapes:
 *  - https://drive.google.com/file/d/<id>/view?usp=sharing
 *  - https://drive.google.com/open?id=<id>
 *  - https://drive.google.com/uc?export=download&id=<id>
 *  - https://drive.usercontent.google.com/download?id=<id>
 */
export function getDriveFileId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!isGoogleDriveUrl(trimmed)) return null;
  const byPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath?.[1]) return byPath[1];
  const byD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (byD?.[1]) return byD[1];
  try {
    const id = new URL(trimmed).searchParams.get('id');
    if (id) return id;
  } catch {
    /* ignore */
  }
  return null;
}

/** Google's own embeddable preview player URL (works for audio and video). */
export function getDriveEmbedUrl(url?: string | null): string | null {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

/** Direct-download URL for a Drive file. */
export function getDriveDownloadUrl(url?: string | null): string | null {
  const id = getDriveFileId(url);
  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download` : null;
}

/** Basic validation for the "paste a link" upload option. */
export function isValidMediaLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
