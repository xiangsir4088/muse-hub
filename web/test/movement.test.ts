import { describe, expect, it } from 'vitest';
import { computeDisplacement, damp, joystickVector } from '../src/viewer/movement';

describe('computeDisplacement', () => {
  it('moves toward -Z at yaw=0', () => {
    const d = computeDisplacement({ forward: 1, strafe: 0 }, 0, 2, 0.5);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(-1);
  });
  it('strafes toward +X at yaw=0', () => {
    const d = computeDisplacement({ forward: 0, strafe: 1 }, 0, 2, 0.5);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });
  it('yaw=90deg turns forward to -X', () => {
    const d = computeDisplacement({ forward: 1, strafe: 0 }, Math.PI / 2, 2, 0.5);
    expect(d.x).toBeCloseTo(-1);
    expect(d.z).toBeCloseTo(0);
  });
  it('diagonal input is normalized (no speed boost)', () => {
    const d = computeDisplacement({ forward: 1, strafe: 1 }, 0, 4, 1);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(4);
  });
});

describe('damp', () => {
  it('converges toward target over time', () => {
    let v = 0;
    for (let i = 0; i < 100; i++) v = damp(v, 10, 12, 1 / 60);
    expect(v).toBeCloseTo(10, 1);
  });
  it('is frame-rate independent', () => {
    let a = 0, b = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 10, 12, 1 / 60);
    for (let i = 0; i < 30; i++) b = damp(b, 10, 12, 1 / 30);
    expect(a).toBeCloseTo(b, 0);
  });
});

describe('joystickVector', () => {
  it('scales inside radius and clamps outside', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 28, y: 0 }, 56);
    expect(v.x).toBeCloseTo(0.5);
    const c = joystickVector({ x: 0, y: 0 }, { x: 100, y: -100 }, 56);
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(1);
  });
});
