import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ExhibitSchema, HallLayoutSchema, RouteSchema } from '@museum/shared';
import { z } from 'zod';

const contentDir = fileURLToPath(new URL('../../content', import.meta.url));
const readJson = (rel: string) => JSON.parse(readFileSync(`${contentDir}/${rel}`, 'utf8'));

describe('content/ data', () => {
  const layout = HallLayoutSchema.parse(readJson('scenes/hall-01.json'));
  const exhibits = readdirSync(`${contentDir}/exhibits`).map(f => ExhibitSchema.parse(readJson(`exhibits/${f}`)));

  it('scene and exhibit files exist', () => {
    expect(existsSync(`${contentDir}/scenes/hall-01.json`)).toBe(true);
    expect(exhibits.length).toBeGreaterThan(0);
  });
  it('every placement references an existing exhibit', () => {
    const ids = new Set(exhibits.map(e => e.id));
    for (const p of layout.exhibits) expect(ids.has(p.exhibitRef), p.id).toBe(true);
  });
  it('every placement zone/caseRef exists', () => {
    const zones = new Set(layout.zones.map(z => z.id));
    const cases = new Set(layout.cases.map(c => c.id));
    for (const p of layout.exhibits) {
      expect(zones.has(p.zone), p.id).toBe(true);
      if (p.caseRef) expect(cases.has(p.caseRef), p.id).toBe(true);
    }
  });
  it('exhibit filename matches its id', () => {
    for (const f of readdirSync(`${contentDir}/exhibits`)) {
      expect(f, 'filename').toBe(`${readJson(`exhibits/${f}`).id}.json`);
    }
  });
  it('has between 5 and 8 exhibits', () => {
    expect(exhibits.length).toBeGreaterThanOrEqual(5);
    expect(exhibits.length).toBeLessThanOrEqual(8);
  });
  it('every route node references an existing exhibit and index matches files', () => {
    const exhibitIds = new Set(exhibits.map(e => e.id));
    const index = z.object({ ids: z.array(z.string()) }).parse(readJson('routes/index.json'));
    expect(index.ids.length).toBeGreaterThanOrEqual(2);
    for (const id of index.ids) {
      const route = RouteSchema.parse(readJson(`routes/${id}.json`));
      expect(route.id, 'filename matches id').toBe(id);
      for (const node of route.nodes) {
        expect(exhibitIds.has(node.exhibitId), `${id}/${node.exhibitId}`).toBe(true);
      }
    }
  });
});
