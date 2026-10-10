#!/usr/bin/env node
/**
 * 构建 GitHub Pages 静态发布包到 `web/dist`：
 *   1. `npm run build`（vite，base 由 VITE_BASE 决定）
 *   2. 生成 `api/models.json` —— 替代 Node 后端的 `/api/models`（Pages 无后端）
 *   3. 复制 `content/`、`LICENSE`、`docs/screenshots` 到 dist
 *   4. 生成 `404.html`（= index.html）与 `.nojekyll`
 *
 * 注意顺序：必须**先**构建，vite 会清空 dist；后写的静态文件才不会被删掉。
 *
 * 用法：
 *   VITE_BASE=/muse-hub/ node scripts/build-pages.mjs
 *   node scripts/build-pages.mjs --no-build   # 复用已有 dist，只做 2~4 步
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(repoRoot, 'web', 'dist');
const NO_BUILD = process.argv.includes('--no-build');

// 1) 前端构建
if (!NO_BUILD) {
  console.log('[pages] building web app …');
  execSync('npm run build', { cwd: repoRoot, stdio: 'inherit', env: process.env });
}

// 2) api/models.json —— 静态模型清单（Pages 无 Node 后端）
const modelsDir = path.join(repoRoot, 'content', 'models');
let models = [];
try {
  models = (await readdir(modelsDir)).filter(f => f.toLowerCase().endsWith('.glb')).map(f => `models/${f}`).sort();
} catch { /* content/models 不存在时留空清单 */ }
await mkdir(path.join(DIST, 'api'), { recursive: true });
await writeFile(path.join(DIST, 'api', 'models.json'), JSON.stringify({ models }, null, 2));
console.log(`[pages] api/models.json -> ${models.length} model(s)`);

// 3) 复制静态资源
for (const item of ['content', 'LICENSE']) {
  await cp(path.join(repoRoot, item), path.join(DIST, item), { recursive: true });
  console.log(`[pages] copied ${item}`);
}
try {
  await cp(path.join(repoRoot, 'docs', 'screenshots'), path.join(DIST, 'docs', 'screenshots'), { recursive: true });
  console.log('[pages] copied docs/screenshots');
} catch { /* 无截图目录时跳过 */ }

// 4) SPA 兜底 + 关闭 Jekyll 处理
const indexHtml = await readFile(path.join(DIST, 'index.html'), 'utf-8');
await writeFile(path.join(DIST, '404.html'), indexHtml);
await writeFile(path.join(DIST, '.nojekyll'), '');
console.log('[pages] 404.html + .nojekyll written');
console.log(`[pages] done -> ${DIST}`);
