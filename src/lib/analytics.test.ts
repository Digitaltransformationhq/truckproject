import { describe, expect, it } from 'vitest';
import { computeAnalytics, formatDuration } from './analytics';
import type { BookingInfo, Load } from '../types';

const NOW = new Date('2026-11-13T12:00:00Z').getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const booking = (status: BookingInfo['status'], history: BookingInfo['history'], extra: Partial<BookingInfo> = {}): BookingInfo => ({ id: 'b', status, history, ...extra });
const load = (id: string, extra: Partial<Load>): Load => ({ id, origin: 'Vadodara', destination: 'Pune', material: 'Textiles', quantity: 12, type: 'FTL', date: '2026-11-14', status: 'Pending', ...extra });

const loads: Load[] = [
  // Accepted 2 hours after posting, then delivered.
  load('1', { createdAt: hoursAgo(50), status: 'Completed', budget: 45000, booking: booking('delivered', [{ status: 'confirmed', at: hoursAgo(48) }, { status: 'delivered', at: hoursAgo(10) }]) }),
  // Accepted 30 minutes after posting, still on the road, with a problem reported.
  load('2', { createdAt: hoursAgo(5), status: 'Accepted', booking: booking('in_transit', [{ status: 'confirmed', at: hoursAgo(4.5) }], { issue: { note: 'Late', at: hoursAgo(1), byMe: false } }) }),
  // Waiting for a truck.
  load('3', { createdAt: hoursAgo(3), origin: 'Surat', destination: 'Nashik' }),
  // Cancelled by the customer.
  load('4', { createdAt: hoursAgo(20), status: 'Cancelled', origin: 'Surat', destination: 'Nashik' }),
  // Posted long ago: outside a 30-day window.
  load('5', { createdAt: new Date(NOW - 60 * 86_400_000).toISOString() }),
];

describe('computeAnalytics', () => {
  const a = computeAnalytics(loads, 30, NOW);

  it('counts requests in the window', () => {
    expect(a.posted).toBe(4);
    expect(a.accepted).toBe(2);
    expect(a.acceptanceRate).toBeCloseTo(0.5);
    expect(a.cancelled).toBe(1);
  });

  it('measures the median time to accept', () => {
    expect(a.medianAcceptMinutes).toBeCloseTo(75); // median of 120 and 30 minutes
  });

  it('adds up delivered trips and their freight value', () => {
    expect(a.delivered).toBe(1);
    expect(a.deliveredValue).toBe(45000);
  });

  it('tracks live marketplace state', () => {
    expect(a.openNow).toBe(2); // load 3 and the old load 5 are still waiting
    expect(a.activeTrips).toBe(1);
    expect(a.needsAttention).toBe(1);
  });

  it('ranks routes by requests', () => {
    expect(a.topRoutes[0]).toEqual({ route: 'Vadodara → Pune', requests: 2, accepted: 2 });
    expect(a.topRoutes[1]).toEqual({ route: 'Surat → Nashik', requests: 2, accepted: 0 });
  });

  it('builds an 8-week trend ending this week', () => {
    expect(a.weeks).toHaveLength(8);
    expect(a.weeks.reduce((sum, week) => sum + week.posted, 0)).toBe(4);
  });

  it('handles an empty marketplace', () => {
    const empty = computeAnalytics([], 30, NOW);
    expect(empty.acceptanceRate).toBeNull();
    expect(empty.medianAcceptMinutes).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatDuration(60 * 24 * 3)).toBe('3 days');
    expect(formatDuration(null)).toBe('—');
  });
});
