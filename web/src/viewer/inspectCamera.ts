export interface OrbitState { target: [number, number, number]; radius: number; azim: number; polar: number }
export type ViewpointName = 'full' | 'top' | 'rim' | 'bottom';

export const ORBIT_LIMITS = { minR: 0.14, maxR: 3.2, minPolar: 0.15, maxPolar: 2.9 };

export function clampOrbit(s: OrbitState): OrbitState {
  return {
    target: s.target,
    radius: Math.min(ORBIT_LIMITS.maxR, Math.max(ORBIT_LIMITS.minR, s.radius)),
    azim: s.azim,
    polar: Math.min(ORBIT_LIMITS.maxPolar, Math.max(ORBIT_LIMITS.minPolar, s.polar))
  };
}

export function orbitPosition(s: OrbitState): [number, number, number] {
  const [tx, ty, tz] = s.target;
  return [
    tx + s.radius * Math.sin(s.polar) * Math.sin(s.azim),
    ty + s.radius * Math.cos(s.polar),
    tz + s.radius * Math.sin(s.polar) * Math.cos(s.azim)
  ];
}

export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function orbitLerp(a: OrbitState, b: OrbitState, t: number): OrbitState {
  const k = easeInOut(t);
  return clampOrbit({
    target: [
      a.target[0] + (b.target[0] - a.target[0]) * k,
      a.target[1] + (b.target[1] - a.target[1]) * k,
      a.target[2] + (b.target[2] - a.target[2]) * k
    ],
    radius: a.radius + (b.radius - a.radius) * k,
    azim: lerpAngle(a.azim, b.azim, k),
    polar: a.polar + (b.polar - a.polar) * k
  });
}

export function orbitFromCamera(camPos: [number, number, number], target: [number, number, number]): OrbitState {
  const dx = camPos[0] - target[0], dy = camPos[1] - target[1], dz = camPos[2] - target[2];
  const r = Math.max(Math.hypot(dx, dy, dz), 1e-6);
  return clampOrbit({
    target, radius: r,
    azim: Math.atan2(dx, dz),
    polar: Math.acos(Math.min(1, Math.max(-1, dy / r)))
  });
}

const PRESETS: Record<ViewpointName, { radius: number; polar: number }> = {
  full: { radius: 2.2, polar: 1.25 },
  top: { radius: 1.6, polar: 0.25 },
  rim: { radius: 0.8, polar: Math.PI / 2 },
  bottom: { radius: 1.0, polar: 2.75 }
};

export function viewpoint(name: ViewpointName, base: OrbitState): OrbitState {
  return clampOrbit({ ...base, ...PRESETS[name] });
}
