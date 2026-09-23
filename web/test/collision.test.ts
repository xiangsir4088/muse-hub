import { describe, expect, it } from 'vitest';
import { aabbFromOrientated, resolveSlide } from '../src/viewer/collision';

describe('aabbFromOrientated', () => {
  it('builds box from center and size', () => {
    const b = aabbFromOrientated([2, 0, 3], [4, 1, 2], 0);
    expect(b).toEqual({ minX: 0, maxX: 4, minZ: 2, maxZ: 4 });
  });
  it('rotating 90deg swaps extents', () => {
    const b = aabbFromOrientated([0, 0, 0], [4, 1, 2], 90);
    expect(b.maxX).toBeCloseTo(1);
    expect(b.maxZ).toBeCloseTo(2);
  });
});

describe('resolveSlide', () => {
  const wall = { minX: -1, maxX: 1, minZ: -1, maxZ: 0 };
  it('lets free movement pass', () => {
    expect(resolveSlide({ x: 5, z: 5 }, { x: 6, z: 5 }, 0.3, [wall])).toEqual({ x: 6, z: 5 });
  });
  it('blocks movement into an obstacle (endpoint inside)', () => {
    const r = resolveSlide({ x: 0, z: 5 }, { x: 0, z: 0.2 }, 0.3, [wall]);
    expect(r).toEqual({ x: 0, z: 5 });
  });
  it('slides along a wall for diagonal input', () => {
    const d = resolveSlide({ x: -1.5, z: 0.4 }, { x: 0, z: -0.2 }, 0.3, [wall]);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(0.4);
  });
  it('respects player radius', () => {
    const r = resolveSlide({ x: 5, z: 5 }, { x: 1.5, z: 5 }, 0.3, [wall]);
    expect(r.x).toBeGreaterThanOrEqual(1 + 0.3 - 1e-9);
  });
});
