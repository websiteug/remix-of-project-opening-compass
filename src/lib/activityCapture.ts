const actions = new Set([
  'Play', 'Pause', 'Next', 'Previous', 'Download', 'Share', 'Like', 'Unlike',
  'Follow', 'Unfollow', 'Sign In', 'Sign Out', 'Sign Up', 'Register', 'Login',
  'Upload', 'Search', 'See All', 'Recently Uploaded', 'Recently Added',
  'Playlist', 'Music', 'Videos', 'Genres', 'Artists', 'Home', 'Dashboard',
  'Save', 'Cancel', 'Close', 'Delete', 'Edit', 'Install App', 'Add to Playlist',
]);
const publicPaths = new Set([
  '/', '/music', '/videos', '/artists', '/genres', '/browse', '/recently-added',
  '/playlist', '/favourites', '/profile', '/dashboard', '/guide', '/reels',
  '/admin', '/admin/users', '/admin/artists', '/admin/music', '/admin/videos',
  '/admin/hero-slides', '/admin/subscriptions', '/admin/genres', '/admin/guide',
  '/admin/activities',
]);

export function activityPath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  if (publicPaths.has(clean)) return clean;
  for (const prefix of ['/artist/', '/video/', '/play/']) {
    if (clean.startsWith(prefix)) return `${prefix}:id`;
  }
  return '/other';
}

export interface ClickActivity {
  action: string;
  target: string;
  page: string;
  destination: string;
}

// Only allowlisted static labels are retained; never copy arbitrary text or input values.
export function describeActivity(target: EventTarget | null, path: string): ClickActivity | null {
  if (!(target instanceof Element) || target.closest('[data-activity-ignore]')) return null;
  const control = target.closest('button, a, input, select, textarea, summary, [role="button"], [role="tab"], [role="checkbox"], [role="switch"], [role="slider"]') ?? target;
  const tag = control.tagName.toLowerCase();
  const role = control.getAttribute('role');
  const type = control instanceof HTMLInputElement ? control.type : '';
  const safeTargets = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);
  const safeRoles = new Set(['button', 'tab', 'checkbox', 'switch', 'slider']);
  const targetName = role && safeRoles.has(role) ? role : safeTargets.has(tag) ? tag : 'page';
  const label = control.getAttribute('aria-label') || control.getAttribute('title') || control.textContent?.trim() || '';
  let action = actions.has(label) ? label : `Click ${targetName}`;
  if (type === 'password') action = 'Click password field';
  else if (tag === 'input' || tag === 'textarea') action = 'Click form field';
  let destination = '';
  if (control instanceof HTMLAnchorElement) {
    try {
      const url = new URL(control.href);
      destination = url.origin === window.location.origin ? activityPath(url.pathname) : 'external';
    } catch { /* No destination for invalid links. */ }
  }
  return { action, target: targetName, page: activityPath(path), destination };
}

export function listenForActivities(onClick: (activity: ClickActivity) => void): () => void {
  const listener = (event: MouseEvent) => {
    const activity = describeActivity(event.target, window.location.pathname);
    if (activity) onClick(activity);
  };
  document.addEventListener('click', listener, true);
  return () => document.removeEventListener('click', listener, true);
}

// Use a fixed cutoff so clearing never deletes new clicks arriving during deletion.
export async function clearActivityBatches(fetchIds: () => Promise<string[]>, deleteIds: (ids: string[]) => Promise<void>): Promise<number> {
  let count = 0;
  while (true) {
    const ids = await fetchIds();
    if (!ids.length) return count;
    await deleteIds(ids);
    count += ids.length;
  }
}