import { once } from 'node:events';
import { readdirSync } from 'node:fs';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';

async function withServer(fn: (base: string) => Promise<void>) {
  const srv = createApp().listen(0);
  await once(srv, 'listening');
  try { await fn(`http://127.0.0.1:${(srv.address() as AddressInfo).port}`); }
  finally { srv.close(); }
}

/**
 * 条件请求必须走 node:http —— fetch/undici 按 Fetch 规范把 If-None-Match
 * 当禁用头静默丢弃，用 fetch 测 304 永远测不出来。
 */
function httpGet(url: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: NodeJS.Dict<string | string[]> }>((resolve, reject) => {
    const req = request(url, { headers }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('server read paths', () => {
  it('serves health', () => withServer(async b => {
    expect((await fetch(`${b}/api/health`)).ok).toBe(true);
  }));
  it('serves content JSON', () => withServer(async b => {
    const res = await fetch(`${b}/content/scenes/hall-01.json`);
    expect(res.ok).toBe(true);
    expect((await res.json()).id).toBe('hall-01');
  }));
  it('404s unknown content', () => withServer(async b => {
    expect((await fetch(`${b}/content/nope.json`)).status).toBe(404);
  }));
});

describe('GET /api/models', () => {
  it('lists the glb files present in content/models', () => withServer(async b => {
    const res = await fetch(`${b}/api/models`);
    expect(res.ok).toBe(true);
    const { models } = (await res.json()) as { models: string[] };
    const onDisk = readdirSync(fileURLToPath(new URL('../../content/models', import.meta.url)))
      .filter(f => f.toLowerCase().endsWith('.glb'))
      .map(f => `models/${f}`)
      .sort();
    expect(models).toEqual(onDisk);
    for (const m of models) expect(m).toMatch(/^models\/.+\.glb$/);
  }));
});

describe('cache policy', () => {
  // 曾用 maxAge: '5m'，与"放入 glb / 改完 JSON 刷新即生效"的承诺矛盾
  it('serves content with ETag revalidation instead of a fixed max-age', () => withServer(async b => {
    const res = await fetch(`${b}/content/scenes/hall-01.json`);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('cache-control')).not.toMatch(/max-age=[1-9]/);
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();

    const revalidated = await httpGet(`${b}/content/scenes/hall-01.json`, { 'if-none-match': etag as string });
    expect(revalidated.status).toBe(304);
    expect(revalidated.headers['cache-control']).toBe('no-cache');
  }));
});
