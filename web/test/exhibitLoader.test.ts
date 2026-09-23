import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Exhibit } from '@museum/shared';

const state = vi.hoisted(() => ({
  next: (() => Promise.reject(new Error('no glb mock set'))) as (url: string) => Promise<{ scene: THREE.Object3D }>
}));

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync(url: string) { return state.next(url); }
  }
}));

import { decideModelSource, loadExhibitModel, unitHeightFit } from '../src/viewer/exhibitLoader';

const base: Exhibit = {
  id: 'x', name: { zh: 'a', en: 'b' }, dynasty: { zh: 'a', en: 'b' },
  material: { zh: 'a', en: 'b' }, summary: { zh: 'a', en: 'b' },
  model: 'models/x.glb', hotspots: []
};

describe('decideModelSource', () => {
  it('picks glb when file is known to exist', () => {
    expect(decideModelSource({ ...base, procedural: undefined }, new Set(['models/x.glb']))).toBe('glb');
  });
  it('falls back to procedural when glb missing', () => {
    expect(decideModelSource({ ...base, procedural: 'ding' }, new Set<string>())).toBe('procedural');
  });
  it('signals error when neither is available', () => {
    expect(decideModelSource({ ...base, procedural: undefined }, new Set<string>())).toBe('error');
  });
});

describe('unitHeightFit', () => {
  it('brings a model to unit height with its base on the floor', () => {
    expect(unitHeightFit(1, 3)).toEqual({ scale: 0.5, offsetY: -0.5 });
  });
  it('keeps a centred model centred after the base is dropped to zero', () => {
    expect(unitHeightFit(-0.5, 0.5)).toEqual({ scale: 1, offsetY: 0.5 });
  });
  it('never divides by a zero-height box', () => {
    const fit = unitHeightFit(0, 0);
    expect(Number.isFinite(fit.scale)).toBe(true);
    expect(Number.isFinite(fit.offsetY)).toBe(true);
    expect(fit.scale).toBeLessThanOrEqual(100);
  });
});

/** 高度 2、底面在 y=1 的立方体（偏移写在对象自身的 position 上） */
function offsetCube(): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)).translateY(2);
}

/** 同样高度 2、底面在 y=1，但偏移烘焙进 geometry（glb 常见形态） */
function geometryOffsetCube(): THREE.Mesh {
  const g = new THREE.BoxGeometry(1, 2, 1);
  g.translate(0, 2, 0);
  return new THREE.Mesh(g);
}

describe('loadExhibitModel', () => {
  it('normalises a real glb into a placement group over a fit group', async () => {
    state.next = async () => ({ scene: offsetCube() });
    const group = await loadExhibitModel({ ...base, procedural: undefined }, new Set(['models/x.glb']));

    expect(group.name).toBe('placement');
    const fit = group.children[0];
    expect(fit.name).toBe('fit');
    expect(fit.scale.x).toBeCloseTo(0.5);
    expect(fit.position.y).toBeCloseTo(-0.5);
  });

  it('keeps the offset when the caller positions the returned group', async () => {
    state.next = async () => ({ scene: offsetCube() });
    const group = await loadExhibitModel({ ...base, procedural: undefined }, new Set(['models/x.glb']));

    // 复现 addExhibit 的调用方式：外层 group 承担 placement 位姿
    group.position.set(-6.5, 1.05, 3);
    group.quaternion.fromArray([0, 0, 0, 1]);

    const box = new THREE.Box3().setFromObject(group);
    expect(box.min.y).toBeCloseTo(1.05, 5);   // 底面落在展柜托板高度
    expect(box.max.y).toBeCloseTo(2.05, 5);   // 且保持 1 单位高
  });

  it('normalises the same way when the offset is baked into the geometry', async () => {
    state.next = async () => ({ scene: geometryOffsetCube() });
    const group = await loadExhibitModel({ ...base, procedural: undefined }, new Set(['models/x.glb']));
    group.position.set(0, 1.05, 0);

    const box = new THREE.Box3().setFromObject(group);
    expect(box.min.y).toBeCloseTo(1.05, 5);
    expect(box.max.y).toBeCloseTo(2.05, 5);
  });

  it('falls back to procedural and flags the fallback when the glb fails', async () => {
    state.next = async () => { throw new Error('404'); };
    const group = await loadExhibitModel({ ...base, procedural: 'ding' }, new Set(['models/x.glb']));
    expect(group.userData.loadError).toBe(true);
    expect(group.userData.noContent).toBeUndefined();
  });

  it('flags no content when neither glb nor procedural is available', async () => {
    state.next = async () => { throw new Error('404'); };
    const group = await loadExhibitModel({ ...base, procedural: undefined }, new Set(['models/x.glb']));
    expect(group.userData.loadError).toBe(true);
    expect(group.userData.noContent).toBe(true);
  });

  it('skips the network entirely when the model is known to be absent', async () => {
    let called = 0;
    state.next = async () => { called++; throw new Error('should not be called'); };
    const group = await loadExhibitModel({ ...base, procedural: 'ding' }, new Set<string>());
    expect(called).toBe(0);
    expect(group.userData.loadError).toBe(true);
  });

  it('still tries the glb when no availability list was supplied', async () => {
    let called = 0;
    state.next = async () => { called++; return { scene: offsetCube() }; };
    await loadExhibitModel({ ...base, procedural: 'ding' });
    expect(called).toBe(1);
  });
});
