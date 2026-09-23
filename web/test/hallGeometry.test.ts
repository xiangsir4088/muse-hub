import { HallLayoutSchema } from '@museum/shared';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildHallGeometry, collidersFromGeometry } from '../src/viewer/hallGeometry';

const layout = HallLayoutSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('../../content/scenes/hall-01.json', import.meta.url)), 'utf8'))
);
const defs = buildHallGeometry(layout);
const kind = (k: string) => defs.filter(d => d.kind === k);

describe('buildHallGeometry', () => {
  it('has one floor and four walls', () => {
    expect(kind('floor')).toHaveLength(1);
    expect(kind('wall')).toHaveLength(4);
  });
  it('has one zone plate per zone', () => {
    expect(kind('zone-plate')).toHaveLength(layout.zones.length);
  });
  it('freestanding/wall cases get body+glass, platforms body only', () => {
    expect(kind('case-body')).toHaveLength(layout.cases.length);
    expect(kind('case-glass')).toHaveLength(layout.cases.filter(c => c.type !== 'platform').length);
  });
  it('glass box sits above case body base', () => {
    const g = kind('case-glass')[0];
    expect(g.position[1]).toBeGreaterThan(0);
  });
  /**
   * 回归：墙体中心曾留在 y=0，5m 高的墙只覆盖 -2.5~2.5m，
   * 2.5m 以上没有墙面 → 上半间房子是黑的，挂在高处的壁画悬空。
   */
  it('walls run from the floor all the way up to the ceiling', () => {
    for (const w of kind('wall')) {
      const bottom = w.position[1] - w.size[1] / 2;
      const top = w.position[1] + w.size[1] / 2;
      expect(bottom).toBeLessThanOrEqual(0.001);
      expect(top).toBeGreaterThanOrEqual(layout.floor.height - 0.02);
    }
  });
});

describe('collidersFromGeometry', () => {
  it('excludes floor, zone plates and glass', () => {
    const boxes = collidersFromGeometry(defs, layout);
    const expected = kind('wall').length + kind('case-body').length;
    expect(boxes).toHaveLength(expected);
  });
  it('west wall collider covers west edge', () => {
    const boxes = collidersFromGeometry(defs, layout);
    expect(boxes.some(b => b.minX <= -12 && b.maxX >= -11.9)).toBe(true);
  });
});
