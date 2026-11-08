import { describe, expect, test } from 'bun:test';
import { dashboardLinksFor } from './dashboardLinks';

describe('dashboard links in the mobile More menu', () => {
  test('artists see their dashboard', () => {
    expect(dashboardLinksFor({ isArtist: true, isAdmin: false }).map(l => l.to)).toEqual(['/dashboard']);
  });
  test('admins see the admin dashboard', () => {
    expect(dashboardLinksFor({ isArtist: false, isAdmin: true }).map(l => l.to)).toEqual(['/admin']);
  });
  test('admin who is also an artist sees both', () => {
    expect(dashboardLinksFor({ isArtist: true, isAdmin: true }).map(l => l.to)).toEqual(['/dashboard', '/admin']);
  });
  test('regular listeners see no dashboard', () => {
    expect(dashboardLinksFor({ isArtist: false, isAdmin: false })).toEqual([]);
  });
});
