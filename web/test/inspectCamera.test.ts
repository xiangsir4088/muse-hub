import { describe, expect, it } from 'vitest';
import {
  ORBIT_LIMITS, clampOrbit, easeInOut, lerpAngle, orbitFromCamera,
  orbitLerp, orbitPosition, viewpoint
} from '../src/viewer/inspectCamera';

describe('inspectCamera', () => {
  it('orbitPosition places camera above target at polar=0 and at radius distance', () => {
    const p = orbitPosition({ target: [1, 2, 3], radius: 2, azim: 0, polar: 0 });
    expect(p[0]).toBeCloseTo(1); expect(p[1]).toBeCloseTo(4); expect(p[2]).toBeCloseTo(3);
    const q = orbitPosition({ target: [0, 0, 0], radius: 1.5, azim: 0, polar: Math.PI / 2 });
    expect(Math.hypot(...q)).toBeCloseTo(1.5);
  });
  it('clampOrbit enforces radius and polar limits', () => {
    const s = clampOrbit({ target: [0, 0, 0], radius: 99, azim: 0, polar: 9 });
    expect(s.radius).toBe(ORBIT_LIMITS.maxR);
    expect(s.polar).toBeLessThanOrEqual(ORBIT_LIMITS.maxPolar);
    expect(clampOrbit({ target: [0, 0, 0], radius: 0.001, azim: 0, polar: 0 }).radius).toBe(ORBIT_LIMITS.minR);
  });
  it('orbitFromCamera inverts orbitPosition', () => {
    const base = { target: [1, 1, 1] as [number, number, number], radius: 2, azim: 0.7, polar: 1.2 };
    const back = orbitFromCamera(orbitPosition(base), base.target);
    expect(back.radius).toBeCloseTo(base.radius);
    expect(back.azim).toBeCloseTo(base.azim);
    expect(back.polar).toBeCloseTo(base.polar);
  });
  it('lerpAngle takes the shortest way around', () => {
    expect(lerpAngle(0.1, Math.PI * 2 - 0.1, 0.5)).toBeCloseTo(0);
  });
  it('orbitLerp endpoints match easeInOut(0/1)', () => {
    const a = { target: [0, 0, 0] as [number, number, number], radius: 2, azim: 0, polar: 1.2 };
    const b = { target: [0, 1, 0] as [number, number, number], radius: 1, azim: 1, polar: 1.6 };
    expect(orbitLerp(a, b, 0).radius).toBeCloseTo(a.radius);
    expect(orbitLerp(a, b, 1).radius).toBeCloseTo(b.radius);
    expect(orbitLerp(a, b, 1).target[1]).toBeCloseTo(b.target[1]);
  });
  it('easeInOut is monotone and pinned at 0/1', () => {
    expect(easeInOut(0)).toBe(0); expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-5)).toBe(0); expect(easeInOut(5)).toBe(1);
    expect(easeInOut(0.25)).toBeLessThan(easeInOut(0.75));
  });
  it('viewpoint presets differ and stay within limits', () => {
    const base = { target: [0, 1, 0] as [number, number, number], radius: 2, azim: 0, polar: 1.2 };
    const names = ['full', 'top', 'rim', 'bottom'] as const;
    const radii = names.map(n => viewpoint(n, base).radius);
    expect(new Set(radii).size).toBeGreaterThan(1);
    for (const n of names) {
      const v = viewpoint(n, base);
      expect(v.radius).toBeGreaterThanOrEqual(ORBIT_LIMITS.minR);
      expect(v.polar).toBeGreaterThanOrEqual(ORBIT_LIMITS.minPolar);
    }
    expect(viewpoint('bottom', base).polar).toBeGreaterThan(Math.PI / 2);
    expect(viewpoint('top', base).polar).toBeLessThan(Math.PI / 4);
  });
});
