import { describe, expect, it } from 'vitest';
import { ExhibitSchema, HallLayoutSchema, RouteSchema } from '@museum/shared';

const validExhibit = {
  id: 'guan-ding', name: { zh: '兽面纹鼎', en: 'Animal-mask Ding' },
  dynasty: { zh: '西周', en: 'Western Zhou' }, material: { zh: '青铜', en: 'Bronze' },
  summary: { zh: '圆腹三足。', en: 'Round belly on three legs.' },
  model: 'models/guan-ding.glb', procedural: 'ding', hotspots: []
};

describe('ExhibitSchema', () => {
  it('accepts a valid exhibit', () => {
    expect(ExhibitSchema.parse(validExhibit).id).toBe('guan-ding');
  });
  it('rejects uppercase ids', () => {
    expect(ExhibitSchema.safeParse({ ...validExhibit, id: 'Guan_Ding' }).success).toBe(false);
  });
  it('rejects empty localized text', () => {
    expect(ExhibitSchema.safeParse({ ...validExhibit, name: { zh: '', en: 'x' } }).success).toBe(false);
  });
});

describe('HallLayoutSchema', () => {
  it('accepts a minimal hall', () => {
    const layout = {
      id: 'hall-01', name: { zh: '一号展厅', en: 'Hall 1' },
      floor: { width: 24, depth: 16, height: 5 },
      zones: [{ id: 'bronze', name: { zh: '青铜', en: 'Bronze' }, color: '#8a7a5e', bounds: { x: [-12, 0], z: [-8, 8] } }],
      cases: [{ id: 'case-b2', type: 'freestanding', position: [-7, 0, 2], rotationY: 0, size: [2, 2.4, 2] }],
      exhibits: [{ id: 'pl-1', exhibitRef: 'guan-ding', position: [-7, 1, 2], rotation: [0, 0, 0, 1], zone: 'bronze', caseRef: 'case-b2' }],
      spawn: { position: [0, 1.6, 6], yaw: 0 }
    };
    expect(HallLayoutSchema.parse(layout).cases).toHaveLength(1);
  });
  it('structurally accepts placement with unknown zone (checked by content test)', () => {
    const bad = {
      id: 'h', name: { zh: 'a', en: 'b' }, floor: { width: 10, depth: 10, height: 4 },
      zones: [], cases: [],
      exhibits: [{ id: 'p', exhibitRef: 'e', position: [0, 0, 0], rotation: [0, 0, 0, 1], zone: 'missing' }],
      spawn: { position: [0, 0, 0], yaw: 0 }
    };
    expect(HallLayoutSchema.safeParse(bad).success).toBe(true);
  });
});

describe('RouteSchema', () => {
  it('accepts a minimal valid route', () => {
    const ok = RouteSchema.parse({
      id: 't1', title: { zh: '测试', en: 'Test' },
      nodes: [
        { exhibitId: 'a', walkTo: [0, 0], lookAt: [1, 0], triggerRadius: 2, audio: {}, subtitle: { zh: '甲', en: 'A' } },
        { exhibitId: 'b', walkTo: [2, 0], lookAt: [3, 0], triggerRadius: 2, audio: {}, subtitle: { zh: '乙', en: 'B' } }
      ]
    });
    expect(ok.nodes).toHaveLength(2);
  });
  it('rejects routes with fewer than 2 nodes', () => {
    expect(RouteSchema.safeParse({
      id: 't2', title: { zh: 'x', en: 'x' },
      nodes: [{ exhibitId: 'a', walkTo: [0, 0], lookAt: [1, 0], triggerRadius: 2, audio: {}, subtitle: { zh: '甲', en: 'A' } }]
    }).success).toBe(false);
  });
  it('rejects negative triggerRadius', () => {
    expect(RouteSchema.safeParse({
      id: 't3', title: { zh: 'x', en: 'x' },
      nodes: [
        { exhibitId: 'a', walkTo: [0, 0], lookAt: [1, 0], triggerRadius: -1, audio: {}, subtitle: { zh: '甲', en: 'A' } },
        { exhibitId: 'b', walkTo: [2, 0], lookAt: [3, 0], triggerRadius: 2, audio: {}, subtitle: { zh: '乙', en: 'B' } }
      ]
    }).success).toBe(false);
  });
  it('defaults triggerRadius to 2.5', () => {
    const ok = RouteSchema.parse({
      id: 't4', title: { zh: 'x', en: 'x' },
      nodes: [
        { exhibitId: 'a', walkTo: [0, 0], lookAt: [1, 0], subtitle: { zh: '甲', en: 'A' } },
        { exhibitId: 'b', walkTo: [2, 0], lookAt: [3, 0], subtitle: { zh: '乙', en: 'B' } }
      ]
    });
    expect(ok.nodes[0].triggerRadius).toBe(2.5);
    expect(ok.nodes[0].audio).toEqual({});
  });
});
