import { describe, expect, it } from 'vitest';
import { pointsCalculator } from './pointsCalculator';

describe('pointsCalculator', () => {
  it('calculates accepted coding points for medium problem', () => {
    const result = pointsCalculator.calculateCodingPoints(true, 'medium', 20, 0.8);

    expect(result.basePoints).toBe(25);
    expect(result.totalPoints).toBeGreaterThan(25);
  });

  it('returns zero points for rejected coding submission', () => {
    const result = pointsCalculator.calculateCodingPoints(false, 'hard', 10, 1);

    expect(result.totalPoints).toBe(0);
  });

  it('returns higher points for stronger system design score', () => {
    const low = pointsCalculator.calculateSystemDesignPoints(5.5);
    const high = pointsCalculator.calculateSystemDesignPoints(8.8);

    expect(high.totalPoints).toBeGreaterThan(low.totalPoints);
  });

  it('aggregates points by type', () => {
    const aggregate = pointsCalculator.aggregatePoints([
      { type: 'coding', points: 40 },
      { type: 'resume', points: 20 },
      { type: 'interview', points: 30 },
    ]);

    expect(aggregate.totalPoints).toBe(90);
    expect(aggregate.breakdown.coding).toBe(40);
    expect(aggregate.breakdown.resume).toBe(20);
  });
});
