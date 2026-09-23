import { describe, expect, it } from 'vitest';
import {
  halfExtents, muralDefs, panelDefs, plateOffset, plateTransform, spotDefs, wallArtDefs,
  PLATE_GAP, PLATE_SIZE, PLATE_TILT
} from '../src/viewer/decor';
import { HallLayoutSchema } from '@museum/shared';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const layout = HallLayoutSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('../../content/scenes/hall-01.json', import.meta.url)), 'utf8'))
);

describe('spotDefs', () => {
  it('creates one spot per case, aimed at case, hung from ceiling', () => {
    const spots = spotDefs(layout);
    expect(spots).toHaveLength(layout.cases.length);
    for (const s of spots) {
      expect(s.position[1]).toBeGreaterThan(4);
      expect(s.target[1]).toBeLessThan(1.5);
    }
  });
});

describe('muralDefs', () => {
  it('one mural per zone on the back wall, inside room bounds', () => {
    const murals = muralDefs(layout);
    expect(murals).toHaveLength(layout.zones.length);
    const halfW = layout.floor.width / 2;
    for (const m of murals) {
      expect(m.position[2]).toBeCloseTo(-layout.floor.depth / 2 + 0.11);
      expect(Math.abs(m.position[0])).toBeLessThan(halfW);
      expect(m.size[0]).toBeLessThan(halfW);
    }
  });
  it('两幅壁画都是水墨山水，且场景各不相同', () => {
    const murals = muralDefs(layout);
    expect(murals.map(m => m.scene)).toEqual(['misty-river', 'autumn-peak']);
    expect(new Set(murals.map(m => m.scene)).size).toBe(murals.length);
    expect(murals.every(m => m.title.zh.length > 0 && m.title.en.length > 0)).toBe(true);
  });
  it('壁画整体落在墙体高度内（不压墙裙、不出墙顶）', () => {
    for (const m of muralDefs(layout)) {
      const bottom = m.position[1] - m.size[1] / 2;
      const top = m.position[1] + m.size[1] / 2;
      expect(bottom).toBeGreaterThanOrEqual(1.08);           // 墙裙高 1.08
      expect(top).toBeLessThanOrEqual(layout.floor.height);   // 天花板
    }
  });
});

describe('panelDefs', () => {
  const panels = panelDefs(layout);
  it('has exactly one intro / bronze / song / history panel', () => {
    expect(panels.map(p => p.panel).sort()).toEqual(['bronze', 'history', 'intro', 'song']);
  });
  it('sits on wall inner faces, facing the hall centre', () => {
    const hw = layout.floor.width / 2, hd = layout.floor.depth / 2, face = 0.1;
    for (const p of panels) {
      const [x, , z] = p.position;
      const onWall = Math.abs(Math.abs(x) - (hw - face)) < 0.01 || Math.abs(Math.abs(z) - (hd - face)) < 0.01;
      expect(onWall).toBe(true);
      expect(Math.abs(x)).toBeLessThanOrEqual(hw);
      expect(Math.abs(z)).toBeLessThanOrEqual(hd);
    }
  });
  it('avoids the wall-mounted display cases (west z -7..1, east z -2..6)', () => {
    const west = panels.filter(p => p.position[0] < -10);
    expect(west.length).toBeGreaterThan(0);
    expect(west.every(p => p.position[2] > 1.2)).toBe(true);
    const east = panels.filter(p => p.position[0] > 10);
    expect(east.length).toBeGreaterThan(0);
    expect(east.every(p => p.position[2] < -2.2 || p.position[2] > 6.2)).toBe(true);
  });
});

describe('wallArtDefs', () => {
  const arts = wallArtDefs(layout);
  it('hangs framed artworks inside the hall and clear of wall cases', () => {
    const hw = layout.floor.width / 2, hd = layout.floor.depth / 2;
    expect(arts.length).toBeGreaterThanOrEqual(4);
    for (const a of arts) {
      const [x, , z] = a.position;
      expect(Math.abs(x)).toBeLessThan(hw);
      expect(Math.abs(z)).toBeLessThan(hd);
      // 东西墙上的挂画须避开壁挂展柜（西 z -7..1，东 z -2..6）；北/南墙挂画不受限
      const onSideWall = Math.abs(Math.abs(x) - (hw - 0.1)) < 0.2;
      if (onSideWall && x < 0) expect(z).toBeGreaterThan(1.2);
      if (onSideWall && x > 0) expect(z < -2.2 || z > 6.2).toBe(true);
    }
  });
});

describe('plateTransform', () => {
  const wallCase = { type: 'wall' as const, position: [-11.2, 0, -3] as [number, number, number], rotationY: 90, size: [8, 2.4, 1.2] as [number, number, number] };
  const standCase = { type: 'freestanding' as const, position: [-6.5, 0, 3] as [number, number, number], rotationY: 0, size: [2.2, 2.4, 2.2] as [number, number, number] };
  it('wall cases face the hall centerline (+x for west wall)', () => {
    const t = plateTransform(wallCase);
    expect(Math.atan2(Math.sin(t.rotationY), Math.cos(t.rotationY))).toBeCloseTo(Math.PI / 2);
  });
  it('freestanding cases face the entrance (+z)', () => {
    const t = plateTransform(standCase);
    expect(Math.abs(t.rotationY)).toBeLessThan(0.01);
    expect(t.position[2]).toBeGreaterThan(standCase.position[2]);
  });

  /**
   * 回归：铭牌绕牌面中心后仰，顶边会向柜体内部下沉。
   * 若外移量不足，牌面上半部（中文名）会陷进柜体被遮住 —— 用户实测见过这个 bug。
   */
  it('外移量必须大于倾斜下沉量，牌面整体留在柜体之外', () => {
    const sink = (PLATE_SIZE[1] / 2) * Math.sin(PLATE_TILT);
    expect(plateOffset()).toBeGreaterThan(sink);

    for (const c of layout.cases) {
      const t = plateTransform(c);
      const { hx, hz } = halfExtents(c);
      const [cx, , cz] = c.position;
      // 外移方向：壁挂柜朝向大厅中线（-sign(cx)），独立柜/展台朝向入口 (+z)
      const facesX = c.type === 'wall';
      const s = facesX ? -Math.sign(cx) : 1;
      const axis = facesX ? t.position[0] : t.position[2];
      const face = facesX ? cx + s * hx : cz + hz;
      // 后仰后牌面最高点（离柜体最近的一点）仍在柜体表面之外
      const rear = axis - s * sink;
      // 沿外移方向投影得到净距
      const clear = (rear - face) * s;
      expect({ id: c.id, clear }).toSatisfy(
        (r: { id: string; clear: number }) => r.clear >= PLATE_GAP - 1e-9,
        'plate must stay clear of the case body'
      );
    }
  });

  it('外移量克制，铭牌不至于悬空漂浮', () => {
    expect(plateOffset()).toBeLessThan(0.08);
  });
});
