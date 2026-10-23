import { describe, expect, it } from 'vitest';
import { seedData } from '../data/seed';
import { calculateMatches } from './matching';

describe('calculateMatches', () => {
  it('prioritises exact pickup and return-route matches', () => {
    const matches = calculateMatches(seedData.trucks, seedData.loads);
    expect(matches[0]?.score).toBe(98);
    expect(matches[0]?.reasons).toContain('Exact pickup');
    expect(matches[0]?.reasons).toContain('Return route');
  });

  it('does not match unavailable trucks', () => {
    const trucks = seedData.trucks.map((truck) => ({ ...truck, status: 'Unavailable' as const }));
    expect(calculateMatches(trucks, seedData.loads)).toHaveLength(0);
  });

  it('rejects an over-capacity load with weak route fit', () => {
    const truck = { ...seedData.trucks[0]!, capacity: 2, location: 'Delhi', destination: 'Mumbai' };
    expect(calculateMatches([truck], [seedData.loads[0]!])).toHaveLength(0);
  });
});
