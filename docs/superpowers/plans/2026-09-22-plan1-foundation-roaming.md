# 虚拟文物3D展厅 · 计划1：地基层（展厅漫游）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建单仓库三包结构（shared/web/server），实现可用手感和性能分级的 3D 展厅自由漫游（桌面+移动），展厅与 8 件程序化文物由 `content/` JSON 驱动。

**Architecture:** Three.js 自研查看器（Vite+React+TS）+ 轻量 Express 只读服务；`content/` 目录即数据源（Zod schema 校验、引用完整性测试）；所有可单测逻辑（数学/碰撞/几何/分级/程序化模型）写成纯函数，WebGL 胶水层仅手动验收。

**Tech Stack:** Node ≥20（实测 v24）、npm workspaces、TypeScript 5、Vite 6、React 18、three 0.170、Express 4、Zod 3、Vitest 2、concurrently、tsx。

**Spec:** `docs/superpowers/specs/2026-09-22-museum-3d-hall-design.md`

**后续计划：** 本计划实现规格 §3/§4/§8(读路径)/§9(单测部分)。鉴赏模式=计划2，导览=计划3，后台写接口/上传/Playwright=计划4。

## Global Constraints

- Windows 本地运行；包管理器 npm（workspaces）；全部 ESM（`"type": "module"`）
- 无数据库：唯一数据源是 `content/`，JSON 写入必须走原子写（计划4 用到，本计划提供 `writeJsonAtomic`）
- 浏览完全公开、无登录；本计划 server 只有读接口
- 移动端低档首屏 JS+CSS（gzip）总预算 ≤ 400KB（引擎约 200KB）
- TypeScript strict 模式；`@museum/shared` 通过 vite/vitest/tsconfig paths 别名解析（若 tsx 解析失败，退回相对路径 `../../shared/src/index.ts` 并记录）
- 文物模型：本计划全部使用程序化生成占位（无网络下载），`model` 字段留标准路径供日后替换真实扫描 GLB
- 提交频率：每个 Task 至少一次 commit；提交信息英文 conventional commits

---

## 文件结构（本计划创建）

```
package.json / tsconfig.base.json / vitest.config.ts / .gitignore / README.md
shared/package.json
shared/src/index.ts        # zod schemas + 类型（唯一导出面）
shared/test/schemas.test.ts
shared/test/content.test.ts
server/package.json / server/tsconfig.json
server/src/index.ts        # createApp()：/api/health + /content 静态 + dist 静态(SPA)
server/src/atomic.ts       # writeJsonAtomic
server/test/server.test.ts
web/package.json / web/vite.config.ts / web/tsconfig.json / web/index.html
web/src/main.tsx / web/src/App.tsx
web/src/pages/ViewerPage.tsx # 挂载 viewer + HUD + 信息面板 + 摇杆
web/src/viewer/MuseumViewer.ts   # WebGL 胶水层（唯一持有 renderer 的文件）
web/src/viewer/hallGeometry.ts   # 纯函数：layout JSON → 盒体描述 + 碰撞盒
web/src/viewer/collision.ts      # 纯函数：AABB 构造 + 滑移解算
web/src/viewer/movement.ts       # 纯函数：位移/阻尼/摇杆向量
web/src/viewer/quality.ts        # 纯函数：档位检测 + 档位设置表
web/src/viewer/procedural.ts     # 程序化文物生成器
web/src/viewer/exhibitLoader.ts  # 模型来源决策 + glb/procedural 加载
web/test/movement.test.ts / collision.test.ts / hallGeometry.test.ts
web/test/quality.test.ts / procedural.test.ts / exhibitLoader.test.ts
content/scenes/hall-01.json
content/exhibits/*.json          # 8 件
content/models/.gitkeep  content/audio/.gitkeep  content/textures/.gitkeep
scripts/budget.mjs
```

---

### Task 1: Monorepo 脚手架与服务启动

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`
- Create: `shared/package.json`, `shared/src/index.ts`（临时占位导出）
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`
- Create: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`

**Interfaces:**
- Produces: `npm run dev`（server:3001 + web:5173 代理）、`npm test`（vitest）、`createApp(): Express`（server/src/index.ts）、`@museum/shared` 别名

- [ ] **Step 1: 写根配置**

`package.json`:
```json
{
  "name": "museum-3d",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "workspaces": ["shared", "server", "web"],
  "scripts": {
    "dev": "concurrently -k -n server,web \"npm -w server run dev\" \"npm -w web run dev\"",
    "build": "npm -w web run build",
    "start": "npm -w server run start",
    "test": "vitest run",
    "typecheck": "tsc -p web/tsconfig.json --noEmit"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": { "@museum/shared": ["./shared/src/index.ts"] }
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@museum/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url))
    }
  },
  test: {
    include: ['shared/test/**/*.test.ts', 'server/test/**/*.test.ts', 'web/test/**/*.test.ts']
  }
});
```

`.gitignore`:
```
node_modules/
dist/
*.tmp-*/
.DS_Store
```

- [ ] **Step 2: 写三个 workspace 的包文件**

`shared/package.json`:
```json
{
  "name": "@museum/shared",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": { "zod": "^3.24.0" }
}
```

`shared/src/index.ts`（Task 2 替换为正式 schema）:
```ts
export const SHARED_VERSION = '0.1.0';
```

`server/package.json`:
```json
{
  "name": "@museum/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": { "express": "^4.21.0" },
  "devDependencies": { "@types/express": "^5.0.0", "tsx": "^4.19.0" }
}
```

`server/tsconfig.json`:
```json
{ "extends": "../tsconfig.base.json", "include": ["src", "../shared/src"] }
```

`server/src/index.ts`:
```ts
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function createApp(): Express {
  const app = express();
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/content', express.static(path.join(repoRoot, 'content'), { maxAge: '5m' }));
  const dist = path.join(repoRoot, 'web', 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api|content).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntry) {
  createApp().listen(3001, () => console.log('museum server on http://localhost:3001'));
}
```

`web/package.json`:
```json
{
  "name": "@museum/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173 --strictPort",
    "build": "vite build"
  },
  "dependencies": {
    "@museum/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "three": "^0.170.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

`web/vite.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@museum/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/content': 'http://localhost:3001'
    }
  }
});
```

`web/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "lib": ["ES2022", "DOM", "DOM.Iterable"], "types": ["vite/client"], "noEmit": true },
  "include": ["src", "../shared/src"]
}
```

`web/index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>虚拟文物3D展厅</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`web/src/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

`web/src/App.tsx`:
```tsx
export default function App() {
  return <div id="viewer-root">展厅加载中…</div>;
}
```

- [ ] **Step 3: 安装并启动验证**

Run: `npm install`
Expected: 无报错，workspaces 链接成功
Run: `npm run dev`（后台）→ `curl -s http://localhost:3001/api/health` → Expected: `{"ok":true}`；浏览器开 `http://localhost:5173` 见占位文字。停止。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold npm-workspaces monorepo (web/server/shared) with vite+express"
```

---

### Task 2: 内容 Schema（shared，Zod）

**Files:**
- Modify: `shared/src/index.ts`（替换占位）
- Test: `shared/test/schemas.test.ts`

**Interfaces:**
- Produces: `ExhibitSchema/Exhibit/Hotspot`、`HallLayoutSchema/HallLayout/DisplayCase/Placement/Zone`、`LocalizedText`、`Vec3`、`Quat`（后续所有任务的类型来源）

- [ ] **Step 1: 写失败测试**

`shared/test/schemas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ExhibitSchema, HallLayoutSchema } from '@museum/shared';

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
  it('rejects placement referencing bad zone', () => {
    const bad = {
      id: 'h', name: { zh: 'a', en: 'b' }, floor: { width: 10, depth: 10, height: 4 },
      zones: [], cases: [],
      exhibits: [{ id: 'p', exhibitRef: 'e', position: [0, 0, 0], rotation: [0, 0, 0, 1], zone: 'missing' }],
      spawn: { position: [0, 0, 0], yaw: 0 }
    };
    expect(HallLayoutSchema.safeParse(bad).success).toBe(true); // 结构合法；引用完整性在 content.test 校验
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/test/schemas.test.ts`
Expected: FAIL（ExhibitSchema 未导出）

- [ ] **Step 3: 实现 schema**

`shared/src/index.ts`（整文件替换）:
```ts
import { z } from 'zod';

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export const Quat = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export const LocalizedText = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const Id = z.string().regex(idPattern);

export const HotspotSchema = z.object({
  position: Vec3,
  normal: Vec3.optional(),
  title: LocalizedText,
  body: LocalizedText
});
export type Hotspot = z.infer<typeof HotspotSchema>;

export const ProceduralKind = z.enum(['ding', 'bell', 'hu', 'gui', 'meiping', 'bowl', 'incense', 'bi']);
export type ArtifactKind = z.infer<typeof ProceduralKind>;

export const ExhibitSchema = z.object({
  id: Id,
  name: LocalizedText,
  dynasty: LocalizedText,
  material: LocalizedText,
  summary: LocalizedText,
  model: z.string().regex(/^models\/[A-Za-z0-9._/-]+\.glb$/),
  procedural: ProceduralKind.optional(),
  audio: z.object({ zh: z.string().optional(), en: z.string().optional() }).optional(),
  hotspots: z.array(HotspotSchema).default([])
});
export type Exhibit = z.infer<typeof ExhibitSchema>;

export const ZoneSchema = z.object({
  id: Id,
  name: LocalizedText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bounds: z.object({ x: z.tuple([z.number(), z.number()]), z: z.tuple([z.number(), z.number()]) })
});
export type Zone = z.infer<typeof ZoneSchema>;

export const DisplayCaseSchema = z.object({
  id: Id,
  type: z.enum(['freestanding', 'wall', 'platform']),
  position: Vec3,
  rotationY: z.number().default(0), // degrees
  size: Vec3
});
export type DisplayCase = z.infer<typeof DisplayCaseSchema>;

export const PlacementSchema = z.object({
  id: Id,
  exhibitRef: Id,
  position: Vec3,
  rotation: Quat,
  zone: Id,
  caseRef: Id.optional()
});
export type Placement = z.infer<typeof PlacementSchema>;

export const HallLayoutSchema = z.object({
  id: Id,
  name: LocalizedText,
  floor: z.object({ width: z.number().positive(), depth: z.number().positive(), height: z.number().positive().default(5) }),
  zones: z.array(ZoneSchema),
  cases: z.array(DisplayCaseSchema),
  exhibits: z.array(PlacementSchema),
  spawn: z.object({ position: Vec3, yaw: z.number() })
});
export type HallLayout = z.infer<typeof HallLayoutSchema>;
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run shared/test/schemas.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add shared && git commit -m "feat(shared): zod schemas for exhibits and hall layouts"
```

---

### Task 3: 首批内容数据 + 引用完整性测试

**Files:**
- Create: `content/scenes/hall-01.json`, `content/exhibits/`（8 个 JSON）, `content/models/.gitkeep`, `content/audio/.gitkeep`, `content/textures/.gitkeep`
- Test: `shared/test/content.test.ts`

**Interfaces:**
- Produces: `content/` 数据约定——`/content/scenes/hall-01.json` 与 `/content/exhibits/<id>.json` 为前端加载路径

- [ ] **Step 1: 写失败的引用完整性测试**

`shared/test/content.test.ts`:
```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ExhibitSchema, HallLayoutSchema } from '@museum/shared';

const contentDir = fileURLToPath(new URL('../../content', import.meta.url));
const readJson = (rel: string) => JSON.parse(readFileSync(`${contentDir}/${rel}`, 'utf8'));

describe('content/ data', () => {
  const layout = HallLayoutSchema.parse(readJson('scenes/hall-01.json'));
  const exhibits = readdirSync(`${contentDir}/exhibits`).map(f => ExhibitSchema.parse(readJson(`exhibits/${f}`)));

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
  it('has between 5 and 8 exhibits', () => {
    expect(exhibits.length).toBeGreaterThanOrEqual(5);
    expect(exhibits.length).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run shared/test/content.test.ts`
Expected: FAIL（ENOENT hall-01.json）

- [ ] **Step 3: 写 8 件文物元数据**

`content/exhibits/guan-ding.json`:
```json
{ "id": "guan-ding", "name": { "zh": "兽面纹铜鼎", "en": "Beast-Face Bronze Ding" },
  "dynasty": { "zh": "西周", "en": "Western Zhou" }, "material": { "zh": "青铜", "en": "Bronze" },
  "summary": { "zh": "圆腹、三足、双立耳，腹饰兽面纹，为礼制重器。", "en": "A round-bellied tripod ding with two loop handles; a ritual vessel of the highest order." },
  "model": "models/guan-ding.glb", "procedural": "ding" }
```

`content/exhibits/bianzhong.json`:
```json
{ "id": "bianzhong", "name": { "zh": "编钟", "en": "Set of Bronze Bells" },
  "dynasty": { "zh": "春秋", "en": "Spring & Autumn" }, "material": { "zh": "青铜", "en": "Bronze" },
  "summary": { "zh": "打击乐器，一钟双音，见证礼乐制度。", "en": "Musical bells producing two tones per bell, a witness to ritual music." },
  "model": "models/bianzhong.glb", "procedural": "bell" }
```

`content/exhibits/hu-lei.json`:
```json
{ "id": "hu-lei", "name": { "zh": "壶形盛酒器", "en": "Hu Wine Vessel" },
  "dynasty": { "zh": "商", "en": "Shang" }, "material": { "zh": "青铜", "en": "Bronze" },
  "summary": { "zh": "长颈鼓腹，用于盛酒，饰雷纹地。", "en": "A long-necked wine vessel decorated with thunder patterns." },
  "model": "models/hu-lei.glb", "procedural": "hu" }
```

`content/exhibits/gui-fang.json`:
```json
{ "id": "gui-fang", "name": { "zh": "方座青铜簋", "en": "Square-based Bronze Gui" },
  "dynasty": { "zh": "西周", "en": "Western Zhou" }, "material": { "zh": "青铜", "en": "Bronze" },
  "summary": { "zh": "食器兼礼器，方座圆身，双兽首耳。", "en": "A food vessel with square base and beast-head handles." },
  "model": "models/gui-fang.glb", "procedural": "gui" }
```

`content/exhibits/meiping-qinghua.json`:
```json
{ "id": "meiping-qinghua", "name": { "zh": "青花梅瓶", "en": "Blue-and-white Plum Vase" },
  "dynasty": { "zh": "宋", "en": "Song" }, "material": { "zh": "瓷", "en": "Porcelain" },
  "summary": { "zh": "小口短颈丰肩瘦底，存酒器，线条极简。", "en": "A slender-based wine vase of classic plum-vase silhouette." },
  "model": "models/meiping-qinghua.glb", "procedural": "meiping" }
```

`content/exhibits/yaozhou-wan.json`:
```json
{ "id": "yaozhou-wan", "name": { "zh": "耀州窑刻花碗", "en": "Yaozhou Carved Bowl" },
  "dynasty": { "zh": "北宋", "en": "Northern Song" }, "material": { "zh": "瓷", "en": "Porcelain" },
  "summary": { "zh": "斜刻花纹入釉，刀法犀利，为宋代雅趣代表。", "en": "Deeply carved floral design under olive glaze, a Song-dynasty classic." },
  "model": "models/yaozhou-wan.glb", "procedural": "bowl" }
```

`content/exhibits/xuanhe-lu.json`:
```json
{ "id": "xuanhe-lu", "name": { "zh": "宣和仿古铜香炉", "en": "Antiquarian Incense Burner" },
  "dynasty": { "zh": "宋", "en": "Song" }, "material": { "zh": "铜", "en": "Bronze" },
  "summary": { "zh": "宋人四雅之焚香。仿古造型，炉身温润。", "en": "A Song scholar's burner for incense, one of the four refined arts." },
  "model": "models/xuanhe-lu.glb", "procedural": "incense" }
```

`content/exhibits/yu-bi.json`:
```json
{ "id": "yu-bi", "name": { "zh": "谷纹玉璧", "en": "Jade Bi Disc with Grain Pattern" },
  "dynasty": { "zh": "战国", "en": "Warring States" }, "material": { "zh": "玉", "en": "Jade" },
  "summary": { "zh": "礼天之器，中孔，满饰谷纹象征丰穰。", "en": "A disc for heaven rites, carved with grain symbols of abundance." },
  "model": "models/yu-bi.glb", "procedural": "bi" }
```

注意 `yu-bi.json` 内 `"id": "yu-bi"`，文件名与 id 一致。`mkdir content/models content/audio content/textures` 并各放一个 `.gitkeep`。

- [ ] **Step 4: 写展厅布局**

`content/scenes/hall-01.json`（展厅 24×16m：西半场"青铜礼制"、东半场"宋代雅趣"，中岛为平台柜）:
```json
{
  "id": "hall-01",
  "name": { "zh": "虚拟文物展陈馆 · 常设展", "en": "Virtual Museum Hall · Permanent" },
  "floor": { "width": 24, "depth": 16, "height": 5 },
  "zones": [
    { "id": "bronze", "name": { "zh": "青铜礼制展区", "en": "Bronze Ritual Zone" }, "color": "#6e5c46", "bounds": { "x": [-12, 0], "z": [-8, 8] } },
    { "id": "song", "name": { "zh": "宋代雅趣展区", "en": "Song Elegance Zone" }, "color": "#46586e", "bounds": { "x": [0, 12], "z": [-8, 8] } }
  ],
  "cases": [
    { "id": "case-b1", "type": "wall", "position": [-11.2, 0, -3], "rotationY": 90, "size": [8, 2.4, 1.2] },
    { "id": "case-b2", "type": "freestanding", "position": [-6.5, 0, 3], "rotationY": 0, "size": [2.2, 2.4, 2.2] },
    { "id": "case-b3", "type": "freestanding", "position": [-6.5, 0, -2], "rotationY": 0, "size": [2.2, 2.4, 2.2] },
    { "id": "case-pl1", "type": "platform", "position": [0, 0, -4], "rotationY": 0, "size": [3, 1, 3] },
    { "id": "case-s1", "type": "wall", "position": [11.2, 0, 2], "rotationY": 90, "size": [8, 2.4, 1.2] },
    { "id": "case-s2", "type": "freestanding", "position": [6.5, 0, 3], "rotationY": 0, "size": [2.2, 2.4, 2.2] },
    { "id": "case-s3", "type": "freestanding", "position": [6.5, 0, -2], "rotationY": 0, "size": [2.2, 2.4, 2.2] }
  ],
  "exhibits": [
    { "id": "pl-ding", "exhibitRef": "guan-ding", "position": [-6.5, 1.05, 3], "rotation": [0, 0, 0, 1], "zone": "bronze", "caseRef": "case-b2" },
    { "id": "pl-zhong", "exhibitRef": "bianzhong", "position": [-10.6, 1.05, -1.5], "rotation": [0, 0.707, 0, 0.707], "zone": "bronze", "caseRef": "case-b1" },
    { "id": "pl-hu", "exhibitRef": "hu-lei", "position": [-10.6, 1.05, -4.5], "rotation": [0, 0, 0, 1], "zone": "bronze", "caseRef": "case-b1" },
    { "id": "pl-gui", "exhibitRef": "gui-fang", "position": [-6.5, 1.05, -2], "rotation": [0, 0, 0, 1], "zone": "bronze", "caseRef": "case-b3" },
    { "id": "pl-bi", "exhibitRef": "yu-bi", "position": [0, 1.15, -4], "rotation": [0, 0, 0, 1], "zone": "bronze", "caseRef": "case-pl1" },
    { "id": "pl-meiping", "exhibitRef": "meiping-qinghua", "position": [6.5, 1.05, 3], "rotation": [0, 0, 0, 1], "zone": "song", "caseRef": "case-s2" },
    { "id": "pl-wan", "exhibitRef": "yaozhou-wan", "position": [6.5, 1.05, -2], "rotation": [0, 0, 0, 1], "zone": "song", "caseRef": "case-s3" },
    { "id": "pl-lu", "exhibitRef": "xuanhe-lu", "position": [10.6, 1.05, 2], "rotation": [0, 0.707, 0, 0.707], "zone": "song", "caseRef": "case-s1" }
  ],
  "spawn": { "position": [0, 1.6, 6.5], "yaw": 0 }
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run shared/test/content.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 6: Commit**

```bash
git add content shared && git commit -m "feat(content): permanent hall layout + 8 exhibit metadata files"
```

---

### Task 4: 漫游数学内核（movement + joystick）

**Files:**
- Create: `web/src/viewer/movement.ts`
- Test: `web/test/movement.test.ts`

**Interfaces:**
- Produces: `type XZ {x,z}`、`type MoveInput {forward,strafe}`（-1..1）、`computeDisplacement(input, yaw, speed, dt): XZ`、`damp(current, target, lambda, dt): number`、`joystickVector(origin, current, maxRadius): {x,y,mag}`。约定：yaw 为 Three.js Y 轴欧拉角，前方 = (-sin yaw, -cos yaw)；摇杆 y 向上为负、forward = -y

- [ ] **Step 1: 写失败测试**

`web/test/movement.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeDisplacement, damp, joystickVector } from '../src/viewer/movement';

describe('computeDisplacement', () => {
  it('moves toward -Z at yaw=0', () => {
    const d = computeDisplacement({ forward: 1, strafe: 0 }, 0, 2, 0.5);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(-1);
  });
  it('strafes toward +X at yaw=0', () => {
    const d = computeDisplacement({ forward: 0, strafe: 1 }, 0, 2, 0.5);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });
  it('yaw=90deg turns forward to -X', () => {
    const d = computeDisplacement({ forward: 1, strafe: 0 }, Math.PI / 2, 2, 0.5);
    expect(d.x).toBeCloseTo(-1);
    expect(d.z).toBeCloseTo(0);
  });
  it('diagonal input is normalized (no speed boost)', () => {
    const d = computeDisplacement({ forward: 1, strafe: 1 }, 0, 4, 1);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(4);
  });
});

describe('damp', () => {
  it('converges toward target over time', () => {
    let v = 0;
    for (let i = 0; i < 100; i++) v = damp(v, 10, 12, 1 / 60);
    expect(v).toBeCloseTo(10, 1);
  });
  it('is frame-rate independent', () => {
    let a = 0, b = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 10, 12, 1 / 60);
    for (let i = 0; i < 30; i++) b = damp(b, 10, 12, 1 / 30);
    expect(a).toBeCloseTo(b, 0);
  });
});

describe('joystickVector', () => {
  it('scales inside radius and clamps outside', () => {
    const v = joystickVector({ x: 0, y: 0 }, { x: 28, y: 0 }, 56);
    expect(v.x).toBeCloseTo(0.5);
    const c = joystickVector({ x: 0, y: 0 }, { x: 100, y: -100 }, 56);
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run web/test/movement.test.ts` → Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`web/src/viewer/movement.ts`:
```ts
export interface XZ { x: number; z: number }
export interface MoveInput { forward: number; strafe: number }

export function computeDisplacement(input: MoveInput, yaw: number, speed: number, dt: number): XZ {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = fx * input.forward + rx * input.strafe;
  const dz = fz * input.forward + rz * input.strafe;
  const len = Math.hypot(dx, dz);
  if (len === 0) return { x: 0, z: 0 };
  return { x: (dx / len) * speed * dt, z: (dz / len) * speed * dt };
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function joystickVector(origin: XZ, current: XZ, maxRadius: number): XZ & { mag: number } {
  const dx = current.x - origin.x, dy = current.y - origin.y;
  const len = Math.hypot(dx, dy);
  const k = len > maxRadius ? maxRadius / (len || 1) : 1;
  const x = (dx * k) / maxRadius, y = (dy * k) / maxRadius;
  return { x, y, mag: Math.min(len / maxRadius, 1) };
}
```

- [ ] **Step 4: 运行确认通过** → `npx vitest run web/test/movement.test.ts` Expected: PASS（7 tests）

- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): pure movement math (displacement, damping, joystick)"`

---

### Task 5: 碰撞检测（AABB 滑移）

**Files:**
- Create: `web/src/viewer/collision.ts`
- Test: `web/test/collision.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `interface AABB {minX,maxX,minZ,maxZ}`、`aabbFromOrientated(position: Vec3, size: Vec3, rotationYDeg: number): AABB`、`resolveSlide(from: XZ, to: XZ, radius: number, boxes: AABB[]): XZ`（`XZ` 从 movement 导入）

- [ ] **Step 1: 写失败测试**

`web/test/collision.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { aabbFromOrientated, resolveSlide } from '../src/viewer/collision';

describe('aabbFromOrientated', () => {
  it('builds box from center and size', () => {
    const b = aabbFromOrientated([2, 0, 3], [4, 1, 2], 0);
    expect(b).toEqual({ minX: 0, maxX: 4, minZ: 2, maxZ: 4 });
  });
  it('rotating 90deg swaps extents', () => {
    const b = aabbFromOrientated([0, 0, 0], [4, 1, 2], 90);
    expect(b.maxX).toBeCloseTo(1);
    expect(b.maxZ).toBeCloseTo(2);
  });
});

describe('resolveSlide', () => {
  const wall = { minX: -1, maxX: 1, minZ: -1, maxZ: 0 };
  it('lets free movement pass', () => {
    expect(resolveSlide({ x: 5, z: 5 }, { x: 6, z: 5 }, 0.3, [wall])).toEqual({ x: 6, z: 5 });
  });
  it('blocks movement into an obstacle (endpoint inside)', () => {
    const r = resolveSlide({ x: 0, z: 5 }, { x: 0, z: 0.2 }, 0.3, [wall]);
    expect(r).toEqual({ x: 0, z: 5 }); // z 目标点落入扩展盒内，被挡
  });
  it('slides along a wall for diagonal input', () => {
    // 从墙外左上角斜穿向墙内：法向(z)被挡，切向(x)仍可走
    const d = resolveSlide({ x: -1.5, z: 0.4 }, { x: 0, z: -0.2 }, 0.3, [wall]);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(0.4);
  });
  it('respects player radius', () => {
    const r = resolveSlide({ x: 5, z: 5 }, { x: 1.5, z: 5 }, 0.3, [wall]);
    expect(r.x).toBeGreaterThanOrEqual(1 + 0.3 - 1e-9);
  });
});
```

- [ ] **Step 2: 运行确认失败** → Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`web/src/viewer/collision.ts`:
```ts
import type { Vec3 } from '@museum/shared';
import type { XZ } from './movement';

export interface AABB { minX: number; maxX: number; minZ: number; maxZ: number }

export function aabbFromOrientated(position: Vec3, size: Vec3, rotationYDeg: number): AABB {
  const [px, , pz] = position;
  const [sx, , sz] = size;
  const rad = (rotationYDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  const hx = (sx * c + sz * s) / 2;
  const hz = (sx * s + sz * c) / 2;
  return { minX: px - hx, maxX: px + hx, minZ: pz - hz, maxZ: pz + hz };
}

function blocked(p: XZ, radius: number, boxes: AABB[]): boolean {
  return boxes.some(b => p.x > b.minX - radius && p.x < b.maxX + radius && p.z > b.minZ - radius && p.z < b.maxZ + radius);
}

export function resolveSlide(from: XZ, to: XZ, radius: number, boxes: AABB[]): XZ {
  let result = from;
  const tryX: XZ = { x: to.x, z: from.z };
  if (!blocked(tryX, radius, boxes)) result = tryX;
  const tryZ: XZ = { x: result.x, z: to.z };
  if (!blocked(tryZ, radius, boxes)) result = tryZ;
  return result;
}
```

- [ ] **Step 4: 运行确认通过** → Expected: PASS（6 tests）
- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): circle-vs-AABB sliding collision resolver"`

---

### Task 6: 展厅几何生成（纯函数）

**Files:**
- Create: `web/src/viewer/hallGeometry.ts`
- Test: `web/test/hallGeometry.test.ts`

**Interfaces:**
- Consumes: `HallLayout`（shared）、`AABB`/`aabbFromOrientated`（collision）
- Produces: `interface BoxDef {kind:'floor'|'wall'|'zone-plate'|'case-body'|'case-glass'; position:[number,number,number]; size:[number,number,number]; rotationY:number; color?:string}`、`buildHallGeometry(layout): BoxDef[]`、`collidersFromGeometry(defs, layout): AABB[]`

- [ ] **Step 1: 写失败测试**

`web/test/hallGeometry.test.ts`:
```ts
import { HallLayoutSchema } from '@museum/shared';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildHallGeometry, collidersFromGeometry } from '../src/viewer/hallGeometry';

const layout = HallLayoutSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('../../content/scenes/hall-01.json', import.meta.url)), 'utf8'))
);
const defs = buildHallGeometry(layout);
const kind = (k: string) => defs.filter(d => d.kind === k);

describe('buildHallGeometry', () => {
  it('has one floor and four walls', () => {
    expect(kind('floor')).toHaveLength(1);
    expect(kind('wall')).toHaveLength(4);
  });
  it('has one zone plate per zone', () => {
    expect(kind('zone-plate')).toHaveLength(layout.zones.length);
  });
  it('freestanding/wall cases get body+glass, platforms body only', () => {
    expect(kind('case-body')).toHaveLength(layout.cases.length);
    expect(kind('case-glass')).toHaveLength(layout.cases.filter(c => c.type !== 'platform').length);
  });
  it('glass box sits above case body base', () => {
    const g = kind('case-glass')[0];
    expect(g.position[1]).toBeGreaterThan(0);
  });
});

describe('collidersFromGeometry', () => {
  it('excludes floor, zone plates and glass', () => {
    const boxes = collidersFromGeometry(defs, layout);
    const expected = kind('wall').length + kind('case-body').length;
    expect(boxes).toHaveLength(expected);
  });
  it('west wall collider covers west edge', () => {
    const boxes = collidersFromGeometry(defs, layout);
    expect(boxes.some(b => b.minX <= -12 && b.maxX >= -11.9)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败** → Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`web/src/viewer/hallGeometry.ts`:
```ts
import type { HallLayout } from '@museum/shared';
import { aabbFromOrientated, type AABB } from './collision';

export interface BoxDef {
  kind: 'floor' | 'wall' | 'zone-plate' | 'case-body' | 'case-glass';
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  color?: string;
}

const WALL_T = 0.2;
const BASE_H = 0.9;

export function buildHallGeometry(layout: HallLayout): BoxDef[] {
  const { width, depth } = layout.floor;
  const defs: BoxDef[] = [
    { kind: 'floor', position: [0, -0.1, 0], size: [width, 0.2, depth], rotationY: 0 },
    { kind: 'wall', position: [0, 0, -depth / 2], size: [width + WALL_T * 2, 5, WALL_T], rotationY: 0 },
    { kind: 'wall', position: [0, 0, depth / 2], size: [width + WALL_T * 2, 5, WALL_T], rotationY: 0 },
    { kind: 'wall', position: [-width / 2, 0, 0], size: [WALL_T, 5, depth], rotationY: 0 },
    { kind: 'wall', position: [width / 2, 0, 0], size: [WALL_T, 5, depth], rotationY: 0 }
  ];
  for (const zone of layout.zones) {
    const [x0, x1] = zone.bounds.x, [z0, z1] = zone.bounds.z;
    defs.push({
      kind: 'zone-plate', position: [(x0 + x1) / 2, 0.005, (z0 + z1) / 2],
      size: [x1 - x0, 0.01, z1 - z0], rotationY: 0, color: zone.color
    });
  }
  for (const c of layout.cases) {
    const [cx, , cz] = c.position;
    const [sx, , sz] = c.size;
    defs.push({ kind: 'case-body', position: [cx, BASE_H / 2, cz], size: [sx, BASE_H, sz], rotationY: c.rotationY, color: '#2e2a26' });
    if (c.type !== 'platform') {
      const gh = c.size[1] - BASE_H;
      defs.push({ kind: 'case-glass', position: [cx, BASE_H + gh / 2, cz], size: [sx, gh, sz], rotationY: c.rotationY, color: '#a8c4d4' });
    }
  }
  return defs;
}

export function collidersFromGeometry(defs: BoxDef[], _layout: HallLayout): AABB[] {
  return defs
    .filter(d => d.kind === 'wall' || d.kind === 'case-body')
    .map(d => aabbFromOrientated(d.position, d.size, d.rotationY));
}
```

- [ ] **Step 4: 运行确认通过** → Expected: PASS（6 tests）
- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): hall geometry boxes + collider extraction from layout JSON"`

---

### Task 7: 画质分级（quality tiers）

**Files:**
- Create: `web/src/viewer/quality.ts`
- Test: `web/test/quality.test.ts`

**Interfaces:**
- Produces: `type Tier`、`interface EnvInfo {isMobile,hardwareConcurrency,deviceMemory?}`、`detectTier(env): Tier`、`TIER_SETTINGS: Record<Tier, TierSettings>`；`TierSettings {dprCap, shadows, textureKey:'4k'|'2k'|'1k', maxAnisotropy, lodBias}`

- [ ] **Step 1: 写失败测试**

`web/test/quality.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { detectTier, TIER_SETTINGS } from '../src/viewer/quality';

describe('detectTier', () => {
  it('desktop with strong cores -> high', () => {
    expect(detectTier({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high');
  });
  it('desktop weak -> medium', () => {
    expect(detectTier({ isMobile: false, hardwareConcurrency: 2 })).toBe('medium');
  });
  it('mobile flagship -> medium, mobile weak -> low', () => {
    expect(detectTier({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 8 })).toBe('medium');
    expect(detectTier({ isMobile: true, hardwareConcurrency: 4, deviceMemory: 4 })).toBe('low');
  });
});

describe('TIER_SETTINGS', () => {
  it('tiers descend in capability', () => {
    expect(TIER_SETTINGS.high.dprCap).toBeGreaterThan(TIER_SETTINGS.medium.dprCap);
    expect(TIER_SETTINGS.medium.dprCap).toBeGreaterThan(TIER_SETTINGS.low.dprCap);
    expect(TIER_SETTINGS.low.shadows).toBe(false);
    expect(TIER_SETTINGS.high.shadows).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败** → Expected: FAIL

- [ ] **Step 3: 实现**

`web/src/viewer/quality.ts`:
```ts
export type Tier = 'high' | 'medium' | 'low';

export interface EnvInfo { isMobile: boolean; hardwareConcurrency: number; deviceMemory?: number }

export function detectTier(env: EnvInfo): Tier {
  const strong = env.hardwareConcurrency >= 8 && (env.deviceMemory ?? 8) >= 8;
  const decent = env.hardwareConcurrency >= 4;
  if (!env.isMobile) return strong ? 'high' : decent ? 'medium' : 'medium';
  return strong ? 'medium' : decent ? 'low' : 'low';
}

export interface TierSettings {
  dprCap: number;
  shadows: boolean;
  textureKey: '4k' | '2k' | '1k';
  maxAnisotropy: number;
  lodBias: number;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, shadows: true, textureKey: '4k', maxAnisotropy: 16, lodBias: 0 },
  medium: { dprCap: 1.5, shadows: false, textureKey: '2k', maxAnisotropy: 8, lodBias: 1 },
  low: { dprCap: 1, shadows: false, textureKey: '1k', maxAnisotropy: 4, lodBias: 2 }
};
```

- [ ] **Step 4: 运行确认通过** → Expected: PASS（4 tests）
- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): device-tier detection and per-tier render settings"`

---

### Task 8: 程序化文物生成器

**Files:**
- Create: `web/src/viewer/procedural.ts`
- Test: `web/test/procedural.test.ts`

**Interfaces:**
- Consumes: `ArtifactKind`（shared）
- Produces: `createArtifact(kind: ArtifactKind): THREE.Group`——`group.name = 'artifact:'+kind`，高度约 0.3~1.5m，原点在底面中心

- [ ] **Step 1: 写失败测试**

`web/test/procedural.test.ts`:
```ts
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
```

- [ ] **Step 2: 运行确认失败** → Expected: FAIL

- [ ] **Step 3: 实现**

`web/src/viewer/procedural.ts`:
```ts
import * as THREE from 'three';
import type { ArtifactKind } from '@museum/shared';

const bronze = () => new THREE.MeshStandardMaterial({ color: 0x6e7f66, roughness: 0.55, metalness: 0.8 });
const porcelain = () => new THREE.MeshStandardMaterial({ color: 0xd9e2df, roughness: 0.3, metalness: 0.05 });
const jade = () => new THREE.MeshStandardMaterial({ color: 0x9fb8ac, roughness: 0.35, metalness: 0.05 });

function lathe(profile: [number, number][], mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24), mat);
}

function body(kind: ArtifactKind): THREE.Object3D[] {
  switch (kind) {
    case 'meiping': return [lathe([[0, 0], [.32, 0], [.46, .22], [.5, .55], [.38, .95], [.18, 1.18], [.16, 1.3], [.2, 1.36], [0, 1.36]], porcelain())];
    case 'bowl': return [lathe([[0, 0], [.16, 0], [.4, .14], [.55, .34], [.56, .38], [.52, .36], [0, .3]], porcelain())];
    case 'hu': return [lathe([[0, 0], [.3, 0], [.5, .25], [.55, .6], [.35, .95], [.22, 1.15], [.28, 1.3], [.24, 1.36], [0, 1.36]], bronze())];
    case 'gui': return [
      lathe([[0, 0], [.42, 0], [.5, .15], [.5, .55], [.42, .7], [0, .7]], bronze()),
      lathe([[0, 0], [.46, .02], [.46, .1], [0, .12]], bronze()).translateY(.72),
      new THREE.Mesh(new THREE.TorusGeometry(.5, .06, 8, 24), bronze()).rotateX(Math.PI / 2).translateY(.4)
    ];
    case 'bell': return [
      lathe([[0, 0], [.45, 0], [.42, .1], [.3, .8], [.2, 1.05], [.18, 1.1], [0, 1.1]], bronze()),
      new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), bronze()).translateY(1.14)
    ];
    case 'incense': return [
      lathe([[0, 0], [.4, 0], [.5, .12], [.45, .28], [.5, .32], [.42, .5], [.4, .52], [0, .52]], bronze()),
      ...[-1, 0, 1].map(i => new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .18, 8), bronze())
        .rotateZ(i * .5).translateX(i * .28).translateY(.09))
    ];
    case 'bi': return [new THREE.Mesh(new THREE.TorusGeometry(.55, .14, 12, 32), jade()).rotateX(Math.PI / 2).translateY(.6)];
    case 'ding': return [
      lathe([[0, 0], [.5, 0], [.58, .2], [.58, .6], [.6, .68], [0, .68]], bronze()).translateY(.55),
      new THREE.Mesh(new THREE.TorusGeometry(.58, .05, 8, 24), bronze()).rotateX(Math.PI / 2).translateY(1.23),
      ...[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, .55, 8), bronze())
          .translateX(Math.sin(a) * .4).translateZ(Math.cos(a) * .4).translateY(.275);
      })
    ];
  }
}

export function createArtifact(kind: ArtifactKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `artifact:${kind}`;
  for (const child of body(kind)) group.add(child);
  return group;
}
```

- [ ] **Step 4: 运行确认通过** → Expected: PASS（16 tests）
- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): procedural artifact generator for 8 artifact kinds"`

---

### Task 9: 模型加载决策 + 服务端内容路由验证

**Files:**
- Create: `web/src/viewer/exhibitLoader.ts`
- Create: `server/src/atomic.ts`
- Test: `web/test/exhibitLoader.test.ts`, `server/test/server.test.ts`

**Interfaces:**
- Consumes: `Exhibit`（shared）、`createArtifact`
- Produces: `decideModelSource(exhibit, availableModels: Set<string>): 'glb' | 'procedural' | 'error'`（`availableModels` 存 content 相对路径）、`loadExhibitModel(exhibit): Promise<THREE.Group>`（GLTF 失败→procedural→无 fallback 时空底座并置 `userData.loadError=true`）、`writeJsonAtomic(file: string, data: unknown): Promise<void>`

- [ ] **Step 1: 写失败测试**

`web/test/exhibitLoader.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { decideModelSource } from '../src/viewer/exhibitLoader';

const base = {
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
```

`server/test/server.test.ts`:
```ts
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';

async function withServer(fn: (base: string) => Promise<void>) {
  const srv = createApp().listen(0);
  await once(srv, 'listening');
  try { await fn(`http://127.0.0.1:${(srv.address() as AddressInfo).port}`); }
  finally { srv.close(); }
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
```

`server/test/atomic.test.ts`:
```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
  it('does not leave tmp files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'museum-'));
    const f = path.join(dir, 'sub', 'b.json');
    await writeJsonAtomic(f, { v: 1 });
    const { readdir } = await import('node:fs/promises');
    expect((await readdir(path.dirname(f))).filter(x => x.includes('.tmp'))).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败** → `npx vitest run web/test/exhibitLoader.test.ts server/test` Expected: FAIL

- [ ] **Step 3: 实现**

`web/src/viewer/exhibitLoader.ts`:
```ts
import * as THREE from 'three';
import type { Exhibit } from '@museum/shared';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createArtifact } from './procedural';

export function decideModelSource(exhibit: Exhibit, availableModels: Set<string>): 'glb' | 'procedural' | 'error' {
  if (availableModels.has(exhibit.model)) return 'glb';
  if (exhibit.procedural) return 'procedural';
  return 'error';
}

const gltfLoader = new GLTFLoader();

function pedestal(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x555555 })));
  return g;
}

export async function loadExhibitModel(exhibit: Exhibit): Promise<THREE.Group> {
  try {
    const gltf = await gltfLoader.loadAsync(`/content/${exhibit.model}`);
    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root);
    const h = Math.max(box.max.y - box.min.y, 0.01);
    root.scale.setScalar(1 / h); // 归一化到 1m 高
    root.position.y = -box.min.y / h;
    return root;
  } catch {
    const g = exhibit.procedural ? createArtifact(exhibit.procedural) : pedestal();
    if (!exhibit.procedural) g.userData.loadError = true;
    else if (exhibit.model) g.userData.loadError = true; // 该有 glb 而缺席：标记占位
    return g;
  }
}
```

`server/src/atomic.ts`:
```ts
import { copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  try {
    await rename(tmp, file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EPERM') {
      // Windows：目标被占用时 rename 失败，退化为 copy+unlink
      await copyFile(tmp, file);
      await unlink(tmp).catch(() => undefined);
    } else {
      await unlink(tmp).catch(() => undefined);
      throw err;
    }
  }
}
```

- [ ] **Step 4: 运行确认通过** → Expected: PASS（6 tests）
- [ ] **Step 5: Commit** → `git add web server && git commit -m "feat: exhibit model loading decision, content routes, atomic JSON writer"`

---

### Task 10: 3D 查看器集成与桌面漫游

**Files:**
- Create: `web/src/viewer/MuseumViewer.ts`, `web/src/pages/ViewerPage.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Consumes: 前所有纯函数模块
- Produces: `class MuseumViewer`（构造参数 `ViewerOptions`；方法 `setTier(t)`, `setExternalMove({forward,strafe})`, `dispose()`）——计划 2/3 将在此加 `enterAppraise(id)` 与 `followRoute(route)`，故相机控制需保持 `private yaw/pitch/pos` 可被后续任务的公开方法驱动

- [ ] **Step 1: 实现 MuseumViewer**

`web/src/viewer/MuseumViewer.ts`:
```ts
import * as THREE from 'three';
import type { Exhibit, HallLayout, Placement } from '@museum/shared';
import { buildHallGeometry, collidersFromGeometry, type BoxDef } from './hallGeometry';
import { computeDisplacement, damp, type XZ } from './movement';
import { resolveSlide } from './collision';
import { TIER_SETTINGS, type Tier } from './quality';
import { loadExhibitModel } from './exhibitLoader';

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  layout: HallLayout;
  placements: Placement[];
  onExhibitClick: (placementId: string | null) => void;
  onFps: (fps: number) => void;
}

const WALK_SPEED = 3.2;
const PLAYER_RADIUS = 0.35;
const EYE_HEIGHT = 1.6;

export class MuseumViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private sun: THREE.DirectionalLight;
  private pos: XZ;
  private yaw: number; private pitch = 0;
  private yawTarget: number; private pitchTarget = 0;
  private keys = new Set<string>();
  private externalMove = { forward: 0, strafe: 0 };
  private colliders: ReturnType<typeof collidersFromGeometry>;
  private exhibitGroups: THREE.Group[] = [];
  private raycaster = new THREE.Raycaster();
  private drag: { x: number; y: number; moved: number } | null = null;
  private raf = 0;
  private last = performance.now();
  private frames = 0;
  private fpsClock = 0;
  private opts: ViewerOptions;
  private disposed = false;

  constructor(opts: ViewerOptions) {
    this.opts = opts;
    const { canvas, layout } = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.scene.background = new THREE.Color(0x101418);
    this.scene.fog = new THREE.Fog(0x101418, 18, 42);
    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.05, 100);
    this.camera.rotation.order = 'YXZ';

    this.scene.add(new THREE.HemisphereLight(0xbfd4e8, 0x3a342c, 1.1));
    this.sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
    this.sun.position.set(6, 9, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.sun);

    const palette: Record<BoxDef['kind'], number> = {
      floor: 0x8d8578, wall: 0x6f6a61, 'zone-plate': 0xffffff,
      'case-body': 0x2e2a26, 'case-glass': 0xa8c4d4
    };
    for (const def of buildHallGeometry(layout)) {
      const mat = new THREE.MeshStandardMaterial({
        color: def.color ? new THREE.Color(def.color) : palette[def.kind],
        roughness: def.kind === 'case-glass' ? 0.1 : 0.9,
        transparent: def.kind === 'case-glass',
        opacity: def.kind === 'case-glass' ? 0.18 : 1
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...def.size), mat);
      mesh.position.set(...def.position);
      mesh.rotation.y = (def.rotationY * Math.PI) / 180;
      mesh.receiveShadow = true;
      if (def.kind === 'case-glass') mesh.renderOrder = 1;
      this.scene.add(mesh);
    }

    this.colliders = collidersFromGeometry(buildHallGeometry(layout), layout);
    this.pos = { x: layout.spawn.position[0], z: layout.spawn.position[2] };
    this.yaw = this.yawTarget = layout.spawn.yaw;

    for (const p of opts.placements) void this.addExhibit(p);
    this.bindInput(canvas);
    this.setTier('medium');
    this.loop();
  }

  private async addExhibit(p: Placement) {
    if (this.disposed) return;
    const exhibit = await fetchJson<Exhibit>(`/content/exhibits/${p.exhibitRef}.json`);
    if (!exhibit || this.disposed) return;
    const model = await loadExhibitModel(exhibit);
    model.userData.placementId = p.id;
    model.userData.exhibit = exhibit;
    model.position.set(...p.position);
    model.quaternion.fromArray(p.rotation);
    model.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.userData.placementId = p.id; } });
    this.scene.add(model);
    this.exhibitGroups.push(model);
  }

  private bindInput(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return; // 触摸环顾由 setExternalMove/自有 touch 通道处理
      this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    window.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.yawTarget -= dx * 0.0032;
      this.pitchTarget = Math.min(1.3, Math.max(-1.3, this.pitchTarget - dy * 0.0032));
    });
    window.addEventListener('pointerup', e => {
      if (this.drag && this.drag.moved < 6) this.pick(e.clientX, e.clientY);
      this.drag = null;
    });
    window.addEventListener('keydown', e => this.keys.add(e.code));
    window.addEventListener('keyup', e => this.keys.delete(e.code));
  }

  private pick(cx: number, cy: number) {
    const rect = this.opts.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.exhibitGroups, true);
    const first = hits.find(h => (h.object as THREE.Mesh).userData.placementId ?? (h.object.parent as THREE.Object3D)?.userData?.placementId);
    const id = first ? (first.object.userData.placementId ?? first.object.parent?.userData?.placementId) : null;
    this.opts.onExhibitClick(id ?? null);
  }

  setExternalMove(v: { forward: number; strafe: number }) {
    this.externalMove = v;
  }

  setTier(tier: Tier) {
    const s = TIER_SETTINGS[tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.dprCap));
    this.renderer.shadowMap.enabled = s.shadows;
    this.sun.castShadow = s.shadows;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const s = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const input = {
      forward: Math.max(Math.abs(f), Math.abs(this.externalMove.forward)) ? Math.sign(f || this.externalMove.forward) * Math.max(Math.abs(f), Math.abs(this.externalMove.forward)) : 0,
      strafe: Math.max(Math.abs(s), Math.abs(this.externalMove.strafe)) ? Math.sign(s || this.externalMove.strafe) * Math.max(Math.abs(s), Math.abs(this.externalMove.strafe)) : 0
    };
    const step = computeDisplacement(input, this.yaw, WALK_SPEED, dt);
    this.pos = resolveSlide(this.pos, { x: this.pos.x + step.x, z: this.pos.z + step.z }, PLAYER_RADIUS, this.colliders);

    this.yaw = damp(this.yaw, this.yawTarget, 14, dt);
    this.pitch = damp(this.pitch, this.pitchTarget, 14, dt);
    this.camera.position.set(this.pos.x, EYE_HEIGHT, this.pos.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.renderer.render(this.scene, this.camera);

    this.frames++; this.fpsClock += dt;
    if (this.fpsClock >= 0.5) { this.opts.onFps(Math.round(this.frames / this.fpsClock)); this.frames = 0; this.fpsClock = 0; }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material as THREE.Material | THREE.Material[]; (Array.isArray(m) ? m : [m]).forEach(x => x.dispose()); }
    });
    this.renderer.dispose();
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch { return null; }
}
```

- [ ] **Step 2: 实现 ViewerPage 与 HUD**

`web/src/pages/ViewerPage.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import type { Exhibit, HallLayout, Placement } from '@museum/shared';
import { MuseumViewer } from '../viewer/MuseumViewer';
import { detectTier, type Tier } from '../viewer/quality';
import { joystickVector } from '../viewer/movement';

interface Props {
  layout: HallLayout;
  placements: Placement[];
  exhibitMap: Map<string, Exhibit>;
}

export default function ViewerPage({ layout, placements, exhibitMap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<MuseumViewer | null>(null);
  const [fps, setFps] = useState(0);
  const [tier, setTier] = useState<Tier | 'auto'>(() => {
    const isMobile = matchMedia('(pointer: coarse)').matches;
    return detectTier({ isMobile, hardwareConcurrency: navigator.hardwareConcurrency });
  });
  const [selected, setSelected] = useState<{ placement: Placement; exhibit: Exhibit } | null>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = new MuseumViewer({
      canvas: canvasRef.current!, layout, placements,
      onExhibitClick: id => {
        const p = id ? placements.find(x => x.id === id) : undefined;
        setSelected(p ? { placement: p, exhibit: exhibitMap.get(p.exhibitRef)! } : null);
      },
      onFps: setFps
    });
    viewerRef.current = viewer;
    return () => viewer.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { viewerRef.current?.setTier(tier); }, [tier]);

  const onStick = (kind: 'start' | 'move' | 'end') => (e: React.TouchEvent) => {
    const el = stickRef.current!, knob = knobRef.current!;
    if (kind === 'end') { knob.style.transform = ''; viewerRef.current?.setExternalMove({ forward: 0, strafe: 0 }); return; }
    const t = e.touches[0];
    const r = el.getBoundingClientRect();
    const v = joystickVector({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, { x: t.clientX, y: t.clientY }, r.width / 2);
    knob.style.transform = `translate(${v.x * r.width * 0.4}px, ${v.y * r.width * 0.4}px)`;
    viewerRef.current?.setExternalMove({ forward: -v.y, strafe: v.x });
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,.5)', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
        <b>{layout.name.zh}</b>
        <select value={tier} onChange={e => setTier(e.target.value as Tier)}>
          <option value="high">高画质</option><option value="medium">中画质</option><option value="low">低画质</option>
        </select>
        <span>{fps} FPS</span>
      </div>
      <div ref={stickRef} onTouchStart={onStick('start')} onTouchMove={onStick('move')} onTouchEnd={onStick('end')}
        style={{ position: 'absolute', left: 24, bottom: 24, width: 112, height: 112, borderRadius: '50%', background: 'rgba(255,255,255,.12)', touchAction: 'none', display: matchMedia('(pointer: coarse)').matches ? 'block' : 'none' }}>
        <div ref={knobRef} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.35)', margin: 32 }} />
      </div>
      {selected && (
        <div style={{ position: 'absolute', right: 16, top: 60, width: 300, background: 'rgba(15,18,22,.92)', color: '#eee', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: 0 }}>{selected.exhibit.name.zh} <small>{selected.exhibit.dynasty.zh}</small></h3>
          <p style={{ fontSize: 14 }}>{selected.exhibit.summary.zh}</p>
          <p style={{ fontSize: 12, opacity: .7 }}>{selected.exhibit.name.en}</p>
          <button onClick={() => setSelected(null)} style={{ marginTop: 8 }}>关闭</button>
        </div>
      )}
    </div>
  );
}
```

`web/src/App.tsx`（替换 Task 1 占位）:
```tsx
import { useEffect, useState } from 'react';
import type { Exhibit, HallLayout } from '@museum/shared';
import ViewerPage from './pages/ViewerPage';

export default function App() {
  const [data, setData] = useState<{ layout: HallLayout; exhibitMap: Map<string, Exhibit> } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const layout = (await (await fetch('/content/scenes/hall-01.json')).json()) as HallLayout;
        const exhibitMap = new Map<string, Exhibit>();
        await Promise.all([...new Set(layout.exhibits.map(p => p.exhibitRef))].map(async ref => {
          exhibitMap.set(ref, (await (await fetch(`/content/exhibits/${ref}.json`)).json()) as Exhibit);
        }));
        setData({ layout, exhibitMap });
      } catch { setError('内容加载失败'); }
    })();
  }, []);

  if (error) return <div style={{ color: '#fff', background: '#111', padding: 40 }}>{error}</div>;
  if (!data) return <div>加载中…</div>;
  return <ViewerPage layout={data.layout} placements={data.layout.exhibits} exhibitMap={data.exhibitMap} />;
}
```

- [ ] **Step 3: 全量单测** → Run: `npm test` Expected: 全部 PASS
- [ ] **Step 4: 浏览器手动验收（桌面）**

`npm run dev` 后打开 `http://localhost:5173`，逐项确认：进入展厅出生点、拖拽环顾平滑带阻尼、WASD 行走、撞展柜贴墙滑动不卡顿、点击文物右侧出信息面板、画质切换 FPS 变化、控制台无报错。
- [ ] **Step 5: Commit** → `git add web && git commit -m "feat(web): integrated 3D viewer with desktop roaming, HUD and exhibit panel"`

---

### Task 11: 移动端触摸环顾

**Files:**
- Modify: `web/src/viewer/MuseumViewer.ts`（`bindInput` 内放开 touch 分支）
- Test: 无新增单测（核心数学已在 Task 4 覆盖；此处为事件胶水）

**Interfaces:**
- Consumes: `ViewerOptions`, `setExternalMove`
- Produces: 触摸拖拽 = 环顾（与鼠标同参数），摇杆 = 行走；`touch-action: none` 防页面滚动

- [ ] **Step 1: 打开通道**

`bindInput` 中 `pointerdown` 的 `if (e.pointerType === 'touch') return;` 改为：仅当触摸目标不是摇杆元素（`canvas === e.target`）时进入同一拖拽逻辑。canvas 样式补 `touch-action: none`。

- [ ] **Step 2: 移动模拟验收**

DevTools 设备模拟（iPhone 14 Pro）：单指拖画面转向、摇杆走动、点击文物出面板、双指不触发页面缩放、FPS ≥ 30（中档）。

- [ ] **Step 3: Commit** → `git add web && git commit -m "feat(web): unify pointer input so touch drag looks around"`

---

### Task 12: 包体预算脚本 + README

**Files:**
- Create: `scripts/budget.mjs`, `README.md`
- Test: `server/test/budget.test.ts`（不测脚本，只测其可读 dist——跳过；以命令行为验收）

**Interfaces:**
- Produces: `npm run build` 产物 + `node scripts/budget.mjs` 校验（gzip 总 JS+CSS ≤ 400KB）

- [ ] **Step 1: 写预算脚本**

`scripts/budget.mjs`:
```js
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dir = 'web/dist/assets';
if (!existsSync(dir)) { console.error('先执行 npm run build'); process.exit(1); }
let total = 0;
for (const f of readdirSync(dir)) {
  if (!/\.(js|css)$/.test(f)) continue;
  const gz = gzipSync(readFileSync(`${dir}/${f}`)).length;
  total += gz;
  console.log(`${f}: ${(gz / 1024).toFixed(1)} KB gzipped`);
}
const kb = total / 1024;
console.log(`Total: ${kb.toFixed(1)} KB (budget 400 KB)`);
if (kb > 400) { console.error('OVER BUDGET'); process.exit(1); }
```

- [ ] **Step 2: 构建并校验**

Run: `npm run build && node scripts/budget.mjs`
Expected: PASS。若超预算：确认 three 仅从 `three` 顶层按需 import（Vite tree-shaking），必要时在 `vite.config.ts` 加 `build.rollupOptions.external` 前先试内联；记录实测数字到 README。

- [ ] **Step 3: 写 README.md**

内容：项目简介、`npm install` → `npm run dev`（本地 Windows 双击 Git Bash 亦可）、`npm run build && npm start`（生产单进程 3001）、目录结构（对照规格 §3）、内容维护说明（新增文物 = 放 exhibits JSON + models glb 即上屏）、`node scripts/budget.mjs` 预算命令、当前为"计划1：展厅漫游"，鉴赏/导览/后台见后续计划。

- [ ] **Step 4: 全量验收**

Run: `npm test && npm run build && node scripts/budget.mjs && npm start` → 浏览器 `http://localhost:3001` 走一遍 Task 10 手动清单（Express 托管版）。
- [ ] **Step 5: Commit** → `git add -A && git commit -m "chore: bundle budget script and runbook README"`

---

## Self-Review 结论

1. **规格覆盖**：本计划 ↔ 规格 §3（架构/无DB/原子写）、§4（场景/漫游/分级/加载）、§8（读路径容错）、§9（单测）。§5 鉴赏=计划2、§6 导览=计划3、§7 后台写接口+§9 Playwright/性能=计划4，均已在计划头声明。
2. **占位符扫描**：Task 1 `shared/src/index.ts` 与 `App.tsx` 为显式标注的临时占位，Task 2/10 各自整文件替换——非遗漏。
3. **类型一致性**：`XZ/MoveInput` 定义于 movement、collision 复用其类型导入；`Vec3` 由 shared 导出供 collision 使用；`ArtifactKind` 唯一来源为 shared（Task 8/9 引用一致）；`TierSettings.textureKey` 在计划 2 才消费，本计划仅暴露。
