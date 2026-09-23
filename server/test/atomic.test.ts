import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeJsonAtomic } from '../src/atomic';

describe('writeJsonAtomic', () => {
  it('creates and overwrites a json file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'museum-'));
    const f = path.join(dir, 'a.json');
    await writeJsonAtomic(f, { v: 1 });
    await writeJsonAtomic(f, { v: 2 });
    expect(JSON.parse(await readFile(f, 'utf8'))).toEqual({ v: 2 });
  });
  it('does not leave tmp files and creates parent dirs', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'museum-'));
    const f = path.join(dir, 'sub', 'b.json');
    await writeJsonAtomic(f, { v: 1 });
    expect((await readdir(path.dirname(f))).filter(x => x.includes('.tmp'))).toEqual([]);
  });
});
