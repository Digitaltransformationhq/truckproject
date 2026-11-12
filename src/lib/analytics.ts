import type { Load } from '../types';

const DAY = 86_400_000;

/** When a request was posted: the real timestamp when known, otherwise its pickup date (demo data). */
const postedAt = (load: Load) => new Date(load.createdAt ?? `${load.date}T09:00:00`).getTime();
const eventAt = (load: Load, status: string) => {
  const event = load.booking?.history.find((item) => item.status === status);
  return event ? new Date(event.at).getTime() : undefined;
};
const wasAccepted = (load: Load) => Boolean(load.booking && (load.booking.history.some((item) => item.status === 'confirmed')));

export interface RouteStat { route: string; requests: number; accepted: number }
export interface WeekStat { label: string; start: number; posted: number; accepted: number; delivered: number }
export interface Analytics {
  posted: number;
  accepted: number;
  acceptanceRate: number | null;
  /** Median minutes from posting to a truck owner accepting. */
  medianAcceptMinutes: number | null;
  delivered: number;
  cancelled: number;
  cancellationRate: number | null;
  /** Sum of customer budgets on delivered trips (freight value moved). */
  deliveredValue: number;
  openNow: number;
  activeTrips: number;
  needsAttention: number;
  weeks: WeekStat[];
  topRoutes: RouteStat[];
}

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** Marketplace numbers for the last `days` days, plus an 8-week trend. */
export function computeAnalytics(loads: Load[], days: number, now = Date.now()): Analytics {
  const from = now - days * DAY;
  const inRange = loads.filter((load) => postedAt(load) >= from && postedAt(load) <= now);
  const accepted = inRange.filter(wasAccepted);
  const cancelled = inRange.filter((load) => load.status === 'Cancelled');
  const acceptMinutes = accepted.flatMap((load) => {
    const at = eventAt(load, 'confirmed');
    return at && load.createdAt ? [Math.max(0, (at - postedAt(load)) / 60_000)] : [];
  });
  const deliveredInRange = loads.filter((load) => { const at = eventAt(load, 'delivered'); return at !== undefined && at >= from && at <= now; });

  // Week buckets: the current week plus the 7 before it, oldest first.
  const weekStart = (time: number) => { const d = new Date(time); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const thisWeek = weekStart(now);
  const weeks: WeekStat[] = Array.from({ length: 8 }, (_, index) => {
    const start = thisWeek - (7 - index) * 7 * DAY;
    const end = start + 7 * DAY;
    const within = (time?: number) => time !== undefined && time >= start && time < end;
    return {
      start,
      label: new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      posted: loads.filter((load) => within(postedAt(load))).length,
      accepted: loads.filter((load) => within(eventAt(load, 'confirmed'))).length,
      delivered: loads.filter((load) => within(eventAt(load, 'delivered'))).length,
    };
  });

  const routes = new Map<string, RouteStat>();
  for (const load of inRange) {
    const route = `${load.origin.trim()} → ${load.destination.trim()}`;
    const stat = routes.get(route) ?? { route, requests: 0, accepted: 0 };
    stat.requests += 1;
    if (wasAccepted(load)) stat.accepted += 1;
    routes.set(route, stat);
  }

  const active = loads.filter((load) => load.booking && ['confirmed', 'picked_up', 'in_transit'].includes(load.booking.status));
  return {
    posted: inRange.length,
    accepted: accepted.length,
    acceptanceRate: inRange.length ? accepted.length / inRange.length : null,
    medianAcceptMinutes: median(acceptMinutes),
    delivered: deliveredInRange.length,
    cancelled: cancelled.length,
    cancellationRate: inRange.length ? cancelled.length / inRange.length : null,
    deliveredValue: deliveredInRange.reduce((sum, load) => sum + (load.budget ?? 0), 0),
    openNow: loads.filter((load) => load.status === 'Pending' && !load.booking).length,
    activeTrips: active.length,
    needsAttention: active.filter((load) => load.booking?.issue || (load.booking?.reminderStage ?? 0) >= 2).length,
    weeks,
    topRoutes: [...routes.values()].sort((a, b) => b.requests - a.requests || b.accepted - a.accepted).slice(0, 5),
  };
}

/** "2 h 15 min", "45 min", "3 days". */
export function formatDuration(minutes: number | null) {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 24) { const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60); return m ? `${h} h ${m} min` : `${h} h`; }
  const d = Math.round(minutes / 60 / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}
