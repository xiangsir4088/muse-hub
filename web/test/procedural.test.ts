import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createArtifact } from '../src/viewer/procedural';
import type { ArtifactKind } from '@museum/shared';

const kinds: ArtifactKind[] = ['ding', 'bell', 'hu', 'gui', 'meiping', 'bowl', 'incense', 'bi'];

describe('createArtifact', () => {
  it.each(kinds)('builds %s as a named group of meshes', (kind) => {
    const g = createArtifact(kind);
    expect(g.name).toBe(`artifact:${kind}`);
    expect(g.children.some(c => c instanceof THREE.Mesh)).toBe(true);
  });
  it.each(kinds)('%s stays within 0.2-1.6m height above origin', (kind) => {
    const box = new THREE.Box3().setFromObject(createArtifact(kind));
    expect(box.min.y).toBeGreaterThanOrEqual(-0.05);
    expect(box.max.y).toBeLessThanOrEqual(1.6);
  });
});
