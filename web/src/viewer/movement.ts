export interface XZ { x: number; z: number }
export interface MoveInput { forward: number; strafe: number }

export function computeDisplacement(input: MoveInput, yaw: number, speed: number, dt: number): XZ {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = fx * input.forward + rx * input.strafe;
  const dz = fz * input.forward + rz * input.strafe;
  const len = Math.hypot(dx, dz);
  if (len === 0) return { x: 0, z: 0 };
  return { x: (dx / len) * speed * dt, z: (dz / len) * speed * dt };
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export interface ScreenVec { x: number; y: number }

export function joystickVector(origin: ScreenVec, current: ScreenVec, maxRadius: number): ScreenVec & { mag: number } {
  const dx = current.x - origin.x, dy = current.y - origin.y;
  const len = Math.hypot(dx, dy);
  const k = len > maxRadius ? maxRadius / (len || 1) : 1;
  const x = (dx * k) / maxRadius, y = (dy * k) / maxRadius;
  return { x, y, mag: Math.min(len / maxRadius, 1) };
}
