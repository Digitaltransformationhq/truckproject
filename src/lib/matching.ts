import type { Load, ReturnMatch, Truck } from '../types';

const normalise = (value: string) => value.trim().toLowerCase();
const nearbyWesternHubs = new Set(['vadodara', 'ahmedabad']);

export function calculateMatches(trucks: Truck[], loads: Load[]): ReturnMatch[] {
  const matches: ReturnMatch[] = [];
  for (const truck of trucks.filter(({ status }) => status === 'Available')) {
    for (const load of loads.filter(({ status }) => status === 'Pending')) {
      let score = 32;
      const reasons: string[] = [];
      if (normalise(truck.location) === normalise(load.origin)) {
        score += 35; reasons.push('Exact pickup');
      } else if (nearbyWesternHubs.has(normalise(truck.location)) && nearbyWesternHubs.has(normalise(load.origin))) {
        score += 24; reasons.push('Nearby pickup');
      }
      if (normalise(truck.destination) === normalise(load.destination)) {
        score += 25; reasons.push('Return route');
      }
      if (truck.capacity >= load.quantity) {
        score += 8; reasons.push('Capacity fit');
      } else score -= 25;
      if (score >= 55) matches.push({ truck, load, score: Math.min(score, 98), reasons });
    }
  }
  return matches.sort((left, right) => right.score - left.score);
}

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`));
