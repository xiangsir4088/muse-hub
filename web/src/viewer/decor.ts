import type { DisplayCase, HallLayout } from '@museum/shared';
import type { MuralScene } from './painter';

export interface SpotDef { position: [number, number, number]; target: [number, number, number] }

export function spotDefs(layout: HallLayout): SpotDef[] {
  return layout.cases.map(c => ({
    position: [c.position[0], 4.6, c.position[2]],
    target: [c.position[0], 1.1, c.position[2]]
  }));
}

export interface MuralDef {
  /** 水墨山水场景（两侧各一幅，各不相同） */
  scene: MuralScene;
  /** 题名（中文题款写在画上，英文作画外题名） */
  title: { zh: string; en: string };
  position: [number, number, number];
  size: [number, number];
}

/** 北墙两幅水墨山水：左《溪山烟雨》、右《秋山晚翠》 */
const MURAL_SCENES: { scene: MuralScene; title: { zh: string; en: string } }[] = [
  { scene: 'misty-river', title: { zh: '溪山烟雨', en: 'Misty River, Rainy Hills' } },
  { scene: 'autumn-peak', title: { zh: '秋山晚翠', en: 'Autumn Peaks at Dusk' } }
];

export function muralDefs(layout: HallLayout): MuralDef[] {
  const z = -layout.floor.depth / 2 + 0.11;
  return layout.zones.map((zone, i) => {
    const [x0, x1] = zone.bounds.x;
    const width = Math.min(Math.abs(x1 - x0) - 2, 8);
    const meta = MURAL_SCENES[i % MURAL_SCENES.length];
    return {
      scene: meta.scene,
      title: meta.title,
      position: [(x0 + x1) / 2, 2.6, z],
      size: [width, 3] as [number, number]
    };
  });
}

export interface PlateTransform { position: [number, number, number]; rotationY: number }

/** 墙面讲解图文展板（挂在墙体内表面、朝向厅内） */
export type PanelKind = 'intro' | 'bronze' | 'song' | 'history';
export interface PanelDef { panel: PanelKind; position: [number, number, number]; rotationY: number; size: [number, number] }

/** 文物挂画（带画框的墙上展陈） */
export type WallArtKind = 'ding' | 'vase' | 'bi' | 'bowl';
export interface WallArtDef {
  art: WallArtKind;
  caption: { zh: string; en: string };
  position: [number, number, number];
  rotationY: number;
  size: [number, number];
}

/** 墙体内表面到墙体中心的距离（wall 厚 0.2） */
const WALL_FACE = 0.1;

export function panelDefs(layout: HallLayout): PanelDef[] {
  const hw = layout.floor.width / 2, hd = layout.floor.depth / 2, f = WALL_FACE;
  // 展板纹理为 1024×900（含中英双语），尺寸按同一比例换算；下沿抬到墙裙（高 1.08）之上
  return [
    // 北墙中轴：前言（进门第一眼）
    { panel: 'intro', position: [0, 2.3, -hd + f], rotationY: 0, size: [2.6, 2.29] },
    // 西墙（青铜展区侧）：壁挂展柜占 z -7..1，避开
    { panel: 'bronze', position: [-hw + f, 2.21, 5.2], rotationY: Math.PI / 2, size: [2.4, 2.11] },
    // 东墙（宋代展区侧）：壁挂展柜占 z -2..6，避开
    { panel: 'song', position: [hw - f, 2.21, -5], rotationY: -Math.PI / 2, size: [2.4, 2.11] },
    // 南墙（入口背后）：历史沿革
    { panel: 'history', position: [0, 2.21, hd - f], rotationY: Math.PI, size: [2.4, 2.11] }
  ];
}

export function wallArtDefs(layout: HallLayout): WallArtDef[] {
  const hw = layout.floor.width / 2, hd = layout.floor.depth / 2, f = WALL_FACE;
  return [
    {
      art: 'ding', caption: { zh: '兽面纹鼎 · 商代', en: 'Ding with Taotie Mask · Shang' },
      position: [-11.1, 2.3, -hd + f], rotationY: 0, size: [1.5, 1.9]
    },
    {
      art: 'vase', caption: { zh: '青白釉梅瓶 · 北宋', en: 'Qingbai Meiping · Northern Song' },
      position: [11.1, 2.3, -hd + f], rotationY: 0, size: [1.5, 1.9]
    },
    {
      art: 'bi', caption: { zh: '谷纹玉璧 · 战国', en: 'Jade Bi with Grain Pattern · Warring States' },
      position: [-5.5, 2.3, hd - f], rotationY: Math.PI, size: [1.5, 1.9]
    },
    {
      art: 'bowl', caption: { zh: '青瓷莲花碗 · 五代', en: 'Celadon Lotus Bowl · Five Dynasties' },
      position: [5.5, 2.3, hd - f], rotationY: Math.PI, size: [1.5, 1.9]
    },
    {
      art: 'ding', caption: { zh: '饕餮纹尊 · 商代', en: 'Zun with Taotie Mask · Shang' },
      position: [-hw + f, 2.3, 3.2], rotationY: Math.PI / 2, size: [1.5, 1.9]
    },
    {
      art: 'bowl', caption: { zh: '秘色瓷碗 · 晚唐', en: 'Mise Ware Bowl · Late Tang' },
      position: [hw - f, 2.3, 6.75], rotationY: -Math.PI / 2, size: [1.3, 1.65]
    }
  ];
}

export function halfExtents(c: DisplayCase): { hx: number; hz: number } {
  const rad = (c.rotationY * Math.PI) / 180;
  const co = Math.abs(Math.cos(rad)), si = Math.abs(Math.sin(rad));
  return { hx: (c.size[0] * co + c.size[2] * si) / 2, hz: (c.size[0] * si + c.size[2] * co) / 2 };
}

/** 铭牌尺寸（米） */
export const PLATE_SIZE: [number, number] = [0.5, 0.25];
/** 铭牌后仰角（弧度）：牌面顶部后仰，便于自上而下阅读 */
export const PLATE_TILT = 0.14;
/** 铭牌背面到柜体表面的最小净距 */
export const PLATE_GAP = 0.02;

/**
 * 铭牌中心相对柜体表面的外移量。
 * 铭牌绕牌面中心后仰，顶边会向柜体内部下沉 PLATE_SIZE/2·sin(PLATE_TILT)，
 * 外移量必须大于这个下沉量，否则牌面上半部（中文名所在区域）会陷进柜体被遮住。
 */
export function plateOffset(): number {
  return (PLATE_SIZE[1] / 2) * Math.sin(PLATE_TILT) + PLATE_GAP;
}

export function plateTransform(c: DisplayCase): PlateTransform {
  const { hx, hz } = halfExtents(c);
  const [cx, , cz] = c.position;
  const out = plateOffset();
  const facesX = c.type === 'wall';
  return facesX
    ? { position: [cx - Math.sign(cx) * (hx + out), 0.75, cz], rotationY: -Math.sign(cx) * Math.PI / 2 }
    : { position: [cx, 0.75, cz + hz + out], rotationY: 0 };
}
