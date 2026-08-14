import { describe, expect, it } from 'vitest';
import { calculateVolumetricWeight, createQuotes } from './shipping';

describe('shipping calculations', () => {
  it('calculates volumetric weight using the 5000 divisor', () => {
    expect(calculateVolumetricWeight(30, 20, 15)).toBe(1.8);
  });

  it('never returns a negative volumetric weight for empty dimensions', () => {
    expect(calculateVolumetricWeight()).toBe(0);
  });

  it('returns three domestic service choices with deterministic prices', () => {
    const results = createQuotes({ mode: 'domestic', from: 'Mumbai', to: 'Delhi', weight: 2 });
    expect(results).toHaveLength(3);
    expect(results[0].service).toBe('Domestic Priority');
    expect(results[0].price).toBe(516);
  });

  it('returns international services when the shipping mode is international', () => {
    const results = createQuotes({ mode: 'international', from: 'Mumbai', to: 'Singapore', weight: 1 });
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.price > 0)).toBe(true);
  });

  it('charges against volumetric weight when it exceeds actual weight', () => {
    const compact = createQuotes({ mode: 'domestic', from: 'Mumbai', to: 'Delhi', weight: 1 });
    const bulky = createQuotes({ mode: 'domestic', from: 'Mumbai', to: 'Delhi', weight: 1, length: 100, width: 50, height: 50 });
    expect(bulky[0].price).toBeGreaterThan(compact[0].price);
  });
});
