#!/usr/bin/env node
/**
 * 构建 GitHub Pages 静态发布包：
 * 1. 生成 api/models.json（静态模型清单）
 * 2. 执行 vite build（base: './' 已在 vite.config.ts 配置）
 * 3. 把 content/、api/、docs/、LICENSE、README 复制到 web/dist
 * 4. 生成 404.html（SPA 路由 fallback）
 */
import { execSync } from 'node:child_process';
import { readdir, cp, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const DIST = path.join(repoRoot, 'web', 'dist');

// 1. 生成静态 api/models.json
const modelsDir = path.join(repoRoot, 'content', 'models');
let models = [];
try {
  models = (await readdir(modelsDir)).filter(f => f.toLowerCase().endsWith('.glb')).map(f => `models/${f}`).sort();
} catch { /* 无 models 目录 */ }

const apiDir = path.join(DIST, 'api');
await mkdir(apiDir, { recursive: true });
await writeFile(path.join(apiDir, 'models.json'), JSON.stringify({ models }, null, 2));
console.log(`[pages] api/models.json generated (${models.length} models)`);

// 2. vite build
console.log('[pages] running vite build …');
execSync('npx vite build', { cwd: path.join(repoRoot, 'web'), stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '0' } });

// 3. 复制 content / api / docs / LICENSE / README / docs/video 到 dist
const copyItems = ['content', 'api', 'LICENSE'];
for (const item of copyItems) {
  const src = path.join(repoRoot, item);
  const dst = path.join(DIST, item);
  await cp(src, dst, { recursive: true });
  console.log(`[pages] copied ${item}`);
}

// docs/video 里的 mp4 太大，只复制 README 引用的小截图
try {
  const docsSrc = path.join(repoRoot, 'docs', 'screenshots');
  const docsDst = path.join(DIST, 'docs', 'screenshots');
  await cp(docsSrc, docsDst, { recursive: true });
  console.log('[pages] copied docs/screenshots');
} catch {}

// 4. 404.html = index.html（SPA 路由 fallback）
const indexContent = await readFile(path.join(DIST, 'index.html'), 'utf-8');
await writeFile(path.join(DIST, '404.html'), indexContent);
console.log('[pages] 404.html written');

console.log('\n[pages] Build complete! Deploy web/dist to GitHub Pages.');
console.log('  → Set up GitHub Pages: Source = gh-pages branch, root /');
console.log('  → Or push to gh-pages branch and enable in repo Settings → Pages');
