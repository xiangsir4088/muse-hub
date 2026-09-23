import type { TourRoute } from '@museum/shared';

export interface XZ { x: number; z: number }
export type TourPhase = 'walk' | 'face' | 'present' | 'done';
export interface TourState { node: number; segT: number; phase: TourPhase; faceT: number; dwellLeft: number }
export type TourEvent = 'arrived' | 'departed' | 'finished';

export const WALK_SPEED = 1.6;
export const DWELL_SEC = 2;
const FACE_SEC = 0.8;

export function createTourState(node = 0): TourState {
  return { node, segT: 0, phase: node === 0 ? 'face' : 'walk', faceT: 0, dwellLeft: DWELL_SEC };
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** 第 i 段：nodes[i].walkTo → nodes[i+1].walkTo，端点越界时钳制 */
export function sampleSegment(route: TourRoute, i: number, t: number): XZ {
  const pts = route.nodes.map(n => n.walkTo);
  const at = (k: number) => pts[Math.min(pts.length - 1, Math.max(0, k))];
  const [p0x, p0z] = at(i - 1), [p1x, p1z] = at(i), [p2x, p2z] = at(i + 1), [p3x, p3z] = at(i + 2);
  return { x: catmull(p0x, p1x, p2x, p3x, t), z: catmull(p0z, p1z, p2z, p3z, t) };
}

export function yawTowards(from: XZ, to: XZ): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

function nodePos(route: TourRoute, i: number): XZ {
  const [x, z] = route.nodes[i].walkTo;
  return { x, z };
}

function segmentLength(route: TourRoute, i: number): number {
  let len = 0, prev = sampleSegment(route, i, 0);
  for (let k = 1; k <= 10; k++) {
    const p = sampleSegment(route, i, k / 10);
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return Math.max(len, 0.01);
}

export function tourAdvance(
  state: TourState, route: TourRoute, speaking: boolean, dt: number
): { next: TourState; pos: XZ; events: TourEvent[] } {
  const events: TourEvent[] = [];
  const s: TourState = { ...state };
  const last = route.nodes.length - 1;
  let pos = nodePos(route, s.node);

  switch (s.phase) {
    case 'walk': {
      const seg = Math.max(s.node - 1, 0);
      s.segT += (WALK_SPEED * dt) / segmentLength(route, seg);
      if (s.segT >= 1) { s.segT = 1; s.phase = 'face'; s.faceT = 0; }
      pos = sampleSegment(route, seg, s.segT);
      break;
    }
    case 'face': {
      s.faceT += dt / FACE_SEC;
      if (s.faceT >= 1) { s.faceT = 1; s.phase = 'present'; s.dwellLeft = DWELL_SEC; events.push('arrived'); }
      break;
    }
    case 'present': {
      if (!speaking) {
        s.dwellLeft -= dt;
        if (s.dwellLeft <= 0) {
          events.push('departed');
          if (s.node >= last) { s.phase = 'done'; events.push('finished'); }
          else { s.node += 1; s.segT = 0; s.phase = 'walk'; }
        }
      }
      break;
    }
    case 'done': break;
  }
  return { next: s, pos, events };
}
