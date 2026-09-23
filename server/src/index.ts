import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * `content/` 是唯一数据源，策展人放进一个 glb 或改完一份 JSON 之后刷新就该生效，
 * 所以一律只做 ETag 强校验（no-cache 表示"每次复用前必须回源确认"，不是"不缓存"）。
 * 这里绝不能用 maxAge —— 那会让浏览器在 max-age 内直接用旧内容。
 */
const REVALIDATE = 'no-cache';

export function createApp(): Express {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', REVALIDATE);
    res.json({ ok: true });
  });

  /**
   * 可用模型清单（content 相对路径）。
   * 前端据此跳过不存在的 glb，避免首屏对每件文物都打一次必然 404 的请求。
   */
  app.get('/api/models', async (_req, res) => {
    res.setHeader('Cache-Control', REVALIDATE);
    try {
      const files = await readdir(path.join(repoRoot, 'content', 'models'));
      const models = files
        .filter(f => f.toLowerCase().endsWith('.glb'))
        .map(f => `models/${f}`)
        .sort();
      res.json({ models });
    } catch {
      res.json({ models: [] });
    }
  });

  app.use('/content', express.static(path.join(repoRoot, 'content'), {
    etag: true,
    lastModified: true,
    setHeaders: res => res.setHeader('Cache-Control', REVALIDATE)
  }));

  const dist = path.join(repoRoot, 'web', 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api|content).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntry) {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[museum] invalid PORT: ${process.env.PORT}`);
    process.exit(1);
  }
  createApp().listen(port, () => console.log(`museum server on http://localhost:${port}`));
}
