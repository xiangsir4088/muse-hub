import { describe, expect, it } from 'vitest';
import { detectTier, TIER_SETTINGS } from '../src/viewer/quality';

describe('detectTier', () => {
  it('desktop with strong cores -> high', () => {
    expect(detectTier({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high');
  });
  it('desktop weak -> medium', () => {
    expect(detectTier({ isMobile: false, hardwareConcurrency: 2 })).toBe('medium');
  });
  it('mobile flagship -> medium, mobile weak -> low', () => {
    expect(detectTier({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('medium');
    expect(detectTier({ isMobile: true, hardwareConcurrency: 4, deviceMemory: 4 })).toBe('low');
  });
});

describe('TIER_SETTINGS', () => {
  it('tiers descend in capability', () => {
    expect(TIER_SETTINGS.high.dprCap).toBeGreaterThan(TIER_SETTINGS.medium.dprCap);
    expect(TIER_SETTINGS.medium.dprCap).toBeGreaterThan(TIER_SETTINGS.low.dprCap);
    expect(TIER_SETTINGS.low.shadows).toBe(false);
    expect(TIER_SETTINGS.high.shadows).toBe(true);
  });
});
