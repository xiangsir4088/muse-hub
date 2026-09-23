import type { Vec3 } from '@museum/shared';
import type { XZ } from './movement';

export interface AABB { minX: number; maxX: number; minZ: number; maxZ: number }

export function aabbFromOrientated(position: Vec3, size: Vec3, rotationYDeg: number): AABB {
  const [px, , pz] = position;
  const [sx, , sz] = size;
  const rad = (rotationYDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  const hx = (sx * c + sz * s) / 2;
  const hz = (sx * s + sz * c) / 2;
  return { minX: px - hx, maxX: px + hx, minZ: pz - hz, maxZ: pz + hz };
}

function blocked(p: XZ, radius: number, boxes: AABB[]): boolean {
  return boxes.some(b =>
    p.x > b.minX - radius && p.x < b.maxX + radius &&
    p.z > b.minZ - radius && p.z < b.maxZ + radius
  );
}

export function resolveSlide(from: XZ, to: XZ, radius: number, boxes: AABB[]): XZ {
  let result = from;
  const tryX: XZ = { x: to.x, z: from.z };
  if (!blocked(tryX, radius, boxes)) result = tryX;
  const tryZ: XZ = { x: result.x, z: to.z };
  if (!blocked(tryZ, radius, boxes)) result = tryZ;
  return result;
}
