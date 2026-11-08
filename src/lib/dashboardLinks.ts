export interface DashboardLink {
  to: string;
  label: string;
  kind: 'artist' | 'admin';
}

/** Dashboard shortcuts a signed-in user may see in navigation menus. */
export function dashboardLinksFor(opts: { isArtist: boolean; isAdmin: boolean }): DashboardLink[] {
  const links: DashboardLink[] = [];
  if (opts.isArtist) links.push({ to: '/dashboard', label: 'Dashboard', kind: 'artist' });
  if (opts.isAdmin) links.push({ to: '/admin', label: 'Admin', kind: 'admin' });
  return links;
}
