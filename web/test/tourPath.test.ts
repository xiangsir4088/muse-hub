import { describe, expect, it } from 'vitest';
import type { TourRoute } from '@museum/shared';
import { DWELL_SEC, createTourState, sampleSegment, tourAdvance, yawTowards } from '../src/viewer/tourPath';

const route: TourRoute = {
  id: 'r', title: { zh: 't', en: 't' },
  nodes: [
    { exhibitId: 'a', walkTo: [-4, 3], lookAt: [-6, 3], triggerRadius: 2, audio: {}, subtitle: { zh: '甲', en: 'A' } },
    { exhibitId: 'b', walkTo: [-4, -2], lookAt: [-6, -2], triggerRadius: 2, audio: {}, subtitle: { zh: '乙', en: 'B' } },
    { exhibitId: 'c', walkTo: [0, -4], lookAt: [0, -6], triggerRadius: 2, audio: {}, subtitle: { zh: '丙', en: 'C' } }
  ]
};

describe('tourPath', () => {
  it('sampleSegment interpolates endpoints of each segment', () => {
    const s0 = sampleSegment(route, 0, 0);
    expect(s0.x).toBeCloseTo(-4, 0); expect(s0.z).toBeCloseTo(3, 0);
    const s0e = sampleSegment(route, 0, 1);
    expect(s0e.x).toBeCloseTo(-4, 0); expect(s0e.z).toBeCloseTo(-2, 0);
    const s1 = sampleSegment(route, 1, 1);
    expect(s1.x).toBeCloseTo(0, 0); expect(s1.z).toBeCloseTo(-4, 0);
  });
  it('yawTowards follows roam convention (-sin,-cos)', () => {
    expect(yawTowards({ x: 0, z: 0 }, { x: 0, z: -1 })).toBeCloseTo(0);
    expect(yawTowards({ x: 0, z: 0 }, { x: -1, z: 0 })).toBeCloseTo(Math.PI / 2);
  });
  it('first node faces then presents without walking', () => {
    const { next, events } = tourAdvance(createTourState(0), route, false, 1.0);
    expect(events).toContain('arrived');
    expect(next.phase).toBe('present');
    expect(next.node).toBe(0);
  });
  it('present waits for speech, dwells, then departs to next node', () => {
    let { next: st } = tourAdvance(createTourState(0), route, false, 1.0); // → present
    let r = tourAdvance(st, route, true, 1.0); // speaking: hold
    expect(r.next.phase).toBe('present');
    expect(r.next.dwellLeft).toBe(DWELL_SEC);
    for (let i = 0; i < 40 && r.next.phase === 'present'; i++) r = tourAdvance(r.next, route, false, 0.1);
    expect(r.events).toContain('departed');
    expect(r.next.node).toBe(1);
    expect(r.next.phase).toBe('walk');
  });
  it('walking reaches a node then arrives; last node finishes', () => {
    let st = { ...createTourState(2), phase: 'walk' as const };
    for (let i = 0; i < 400 && st.phase !== 'present'; i++) {
      st = tourAdvance(st, route, false, 0.1).next;
    }
    expect(st.phase).toBe('present');
    let r = tourAdvance(st, route, false, 0.1);
    while (r.next.node === 2 && r.next.phase !== 'done') r = tourAdvance(r.next, route, false, 0.5);
    expect(r.events).toContain('finished');
    expect(r.next.phase).toBe('done');
  });
});
