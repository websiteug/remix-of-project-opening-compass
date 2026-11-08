import { describe, expect, it, vi, afterEach } from 'vitest';
import { activityPath, clearActivityBatches, describeActivity, listenForActivities } from './activityCapture';

afterEach(() => { document.body.replaceChildren(); });

describe('visitor click activities', () => {
  it('captures clicks for anyone, including a guest clicking a nested icon', () => {
    document.body.innerHTML = '<button aria-label="Play"><span>icon</span></button>';
    const captured = vi.fn();
    const stop = listenForActivities(captured);
    document.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(captured).toHaveBeenCalledWith({ action: 'Play', target: 'button', page: '/', destination: '' });
    stop();
    document.querySelector('button')?.click();
    expect(captured).toHaveBeenCalledTimes(1);
  });

  it('captures a click outside a control', () => {
    const paragraph = document.createElement('p');
    expect(describeActivity(paragraph, '/music')?.action).toBe('Click page');
  });

  it('never includes passwords or typed form values', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'private-password';
    input.title = 'private-email@example.com';
    expect(describeActivity(input, '/profile?email=private-email@example.com')).toEqual({
      action: 'Click password field', target: 'input', page: '/profile', destination: '',
    });
  });

  it('does not copy personal text or full link URLs', () => {
    const link = document.createElement('a');
    link.textContent = 'private-email@example.com';
    link.href = 'https://example.org/private?token=secret';
    expect(describeActivity(link, '/video/private-id')).toEqual({ action: 'Click a', target: 'a', page: '/video/:id', destination: 'external' });
    expect(activityPath('/private-email@example.com')).toBe('/other');
  });

  it('does not log the clear action or activity table', () => {
    document.body.innerHTML = '<section data-activity-ignore><button>Clear All Activities</button></section>';
    expect(describeActivity(document.querySelector('button'), '/admin/activities')).toBeNull();
  });

  it('clears all existing batches, not just the displayed recent records', async () => {
    const batches = [['a', 'b'], ['c'], []];
    const deleted: string[] = [];
    const count = await clearActivityBatches(async () => batches.shift() ?? [], async ids => { deleted.push(...ids); });
    expect(deleted).toEqual(['a', 'b', 'c']);
    expect(count).toBe(3);
  });

  it('does not report clear success when a delete fails', async () => {
    await expect(clearActivityBatches(async () => ['a'], async () => { throw new Error('permission denied'); })).rejects.toThrow('permission denied');
  });
});