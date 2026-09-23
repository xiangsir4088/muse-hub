import type { HallLayout } from '@museum/shared';
import { aabbFromOrientated, type AABB } from './collision';

export interface BoxDef {
  kind: 'floor' | 'wall' | 'zone-plate' | 'case-body' | 'case-glass' | 'ceiling' | 'baseboard' | 'light-strip' | 'wainscot' | 'carpet';
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  color?: string;
}

const WALL_T = 0.2;
const BASE_H = 0.9;
const WAIN_H = 1.08;
const WAIN_T = 0.07;
const CARPET_W = 3.6;

export function buildHallGeometry(layout: HallLayout): BoxDef[] {
  const { width, depth, height } = layout.floor;
  // 墙体必须从地面直抵天花板：中心抬到 height/2。
  // （原实现中心留在 y=0，5m 高的墙只覆盖 -2.5~2.5m，上半间房子没有墙，
  //   挂在高处的壁画会悬在黑色虚空里。）
  const defs: BoxDef[] = [
    { kind: 'floor', position: [0, -0.1, 0], size: [width, 0.2, depth], rotationY: 0 },
    { kind: 'wall', position: [0, height / 2, -depth / 2], size: [width + WALL_T * 2, height, WALL_T], rotationY: 0 },
    { kind: 'wall', position: [0, height / 2, depth / 2], size: [width + WALL_T * 2, height, WALL_T], rotationY: 0 },
    { kind: 'wall', position: [-width / 2, height / 2, 0], size: [WALL_T, height, depth], rotationY: 0 },
    { kind: 'wall', position: [width / 2, height / 2, 0], size: [WALL_T, height, depth], rotationY: 0 }
  ];
  for (const zone of layout.zones) {
    const [x0, x1] = zone.bounds.x, [z0, z1] = zone.bounds.z;
    defs.push({
      kind: 'zone-plate', position: [(x0 + x1) / 2, 0.005, (z0 + z1) / 2],
      size: [x1 - x0, 0.01, z1 - z0], rotationY: 0, color: zone.color
    });
  }
  for (const c of layout.cases) {
    const [cx, , cz] = c.position;
    const [sx, , sz] = c.size;
    defs.push({ kind: 'case-body', position: [cx, BASE_H / 2, cz], size: [sx, BASE_H, sz], rotationY: c.rotationY, color: '#2e2a26' });
    if (c.type !== 'platform') {
      const gh = c.size[1] - BASE_H;
      defs.push({ kind: 'case-glass', position: [cx, BASE_H + gh / 2, cz], size: [sx, gh, sz], rotationY: c.rotationY, color: '#a8c4d4' });
    }
  }
  // 木质墙裙：沿四面墙内表面一圈
  const hw = width / 2, hd = depth / 2, f = WALL_T / 2;
  defs.push(
    { kind: 'wainscot', position: [0, WAIN_H / 2, -hd + f + WAIN_T / 2], size: [width, WAIN_H, WAIN_T], rotationY: 0 },
    { kind: 'wainscot', position: [0, WAIN_H / 2, hd - f - WAIN_T / 2], size: [width, WAIN_H, WAIN_T], rotationY: 0 },
    { kind: 'wainscot', position: [-hw + f + WAIN_T / 2, WAIN_H / 2, 0], size: [WAIN_T, WAIN_H, depth], rotationY: 0 },
    { kind: 'wainscot', position: [hw - f - WAIN_T / 2, WAIN_H / 2, 0], size: [WAIN_T, WAIN_H, depth], rotationY: 0 }
  );
  // 入口通道地毯：南墙内表面到大厅中部
  const carpetEnd = -3.5, carpetStart = hd - WALL_T / 2;
  defs.push({
    kind: 'carpet', position: [0, 0.011, (carpetStart + carpetEnd) / 2],
    size: [CARPET_W, 0.012, carpetStart - carpetEnd], rotationY: 0
  });
  return defs;
}

export function collidersFromGeometry(defs: BoxDef[], _layout: HallLayout): AABB[] {
  return defs
    .filter(d => d.kind === 'wall' || d.kind === 'case-body')
    .map(d => aabbFromOrientated(d.position, d.size, d.rotationY));
}
