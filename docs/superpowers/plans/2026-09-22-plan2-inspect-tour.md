# 计划 2：鉴赏模式 + 智能导览 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐数字博物馆两大核心能力——鉴赏模式（抵近观察、视角切换、细节热点、补光）与智能导览（路线自动漫游、按站触发讲解、双语字幕、播放控制）。

**Architecture:** 延续计划 1 的分层：纯数学/状态机模块（inspectCamera、tourPath）先 TDD，再在 MuseumViewer（WebGL 胶水层）加 `roam | inspect` 双模式与导览驱动，React 层（ViewerPage）只负责 HUD/面板/控制条。路线数据走 `content/routes/*.json`，由 shared Zod schema 统一校验；服务端 `/content` 静态目录自动覆盖新目录，无需改动。

**Tech Stack:** 同计划 1 —— Vite + React + TS + three 0.170、Zod、Express（只读）、Vitest。无新增依赖。

**Spec:** `docs/superpowers/specs/2026-09-22-museum-3d-hall-design.md` 第 5 节（鉴赏模式）、第 6 节（智能导览）、第 8 节（音频缺失降级）。

## Global Constraints

- 零外部服务依赖、单仓库、`npm run dev` 即跑；包体预算 JS+CSS gzip ≤ 400KB（`node scripts/budget.mjs`）
- three 版本 0.170：addons 走 `three/addons/...`；光照为物理量级（SpotLight intensity≈55）
- 所有 JSON 数据契约只写在 `shared/src/index.ts`（Zod），前后端共用
- 纯函数模块（无 DOM/WebGL）一律先写失败测试再实现；WebGL 胶水层用浏览器手动验收
- yaw 约定与 movement.ts 一致：前方向 = `(-sin yaw, -cos yaw)`，因此"朝向目标"的 yaw = `Math.atan2(-(tx - px), -(tz - pz))`
- 音频文件当前为零（TTS 占位后补）：`/content/audio/<file>` 404 时必须降级为按字幕字数计时，不得卡死导览
- 提交身份用仓库局部 museum-dev；每个任务结束 commit 一次

---

### Task 1: 路线 Schema + 首批内置路线数据

**Files:**
- Modify: `shared/src/index.ts`（追加 RouteSchema）
- Create: `content/routes/index.json`、`content/routes/bronze-ritual.json`、`content/routes/song-elegance.json`
- Modify: `shared/test/schemas.test.ts`（追加用例）
- Modify: `shared/test/content.test.ts`（追加引用完整性）

**Interfaces:**
- Produces: `RouteSchema` / `TourRoute` / `TourNode`（z.infer 类型），供 Task 3 tourPath 与 Task 6/7 UI 使用；`content/routes/index.json` 形如 `{ "ids": ["bronze-ritual", "song-elegance"] }`

- [ ] **Step 1: 写失败测试**

在 `shared/test/schemas.test.ts` 追加：

```ts
import { RouteSchema } from '../src/index';

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
});
```

在 `shared/test/content.test.ts` 追加（该文件已有读取 content 目录的 helper 风格，照抄现有 `readJson`/路径写法）：

```ts
it('every route node references an existing exhibit and index matches files', async () => {
  const index = RouteSchema.parse(await readJson('routes/index.json'));
  expect(index.ids.length).toBeGreaterThanOrEqual(2);
  for (const id of index.ids) {
    const route = RouteSchema.parse(await readJson(`routes/${id}.json`));
    expect(route.id).toBe(id);
    for (const node of route.nodes) {
      const exhibit = await readJson(`exhibits/${node.exhibitId}.json`);
      expect(exhibit).toBeTruthy();
    }
  }
});
```

注意：`routes/index.json` 的校验用内联 `z.object({ ids: z.array(z.string()) })` 即可，不必进 shared schema。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run shared` — Expected: FAIL（RouteSchema 不存在 / 文件不存在）

- [ ] **Step 3: 实现 schema**

`shared/src/index.ts` 末尾追加：

```ts
export const TourNodeSchema = z.object({
  exhibitId: Id,
  walkTo: z.tuple([z.number(), z.number()]),
  lookAt: z.tuple([z.number(), z.number()]),
  triggerRadius: z.number().positive().default(2.5),
  audio: z.object({ zh: z.string().optional(), en: z.string().optional() }).default({}),
  subtitle: LocalizedText
});
export type TourNode = z.infer<typeof TourNodeSchema>;

export const RouteSchema = z.object({
  id: Id,
  title: LocalizedText,
  nodes: z.array(TourNodeSchema).min(2)
});
export type TourRoute = z.infer<typeof RouteSchema>;
```

- [ ] **Step 4: 写路线数据**

`content/routes/index.json`：

```json
{ "ids": ["bronze-ritual", "song-elegance"] }
```

`content/routes/bronze-ritual.json`（walkTo 取展柜外侧可站立点，lookAt 取展品 XZ；对照 hall-01.json 展柜坐标）：

```json
{
  "id": "bronze-ritual",
  "title": { "zh": "青铜礼制脉络", "en": "Bronze Ritual Traditions" },
  "nodes": [
    { "exhibitId": "guan-ding", "walkTo": [-4.4, 3], "lookAt": [-6.5, 3], "triggerRadius": 2.5,
      "audio": { "zh": "guan-ding-zh.mp3", "en": "guan-ding-en.mp3" },
      "subtitle": { "zh": "首先映入眼帘的是兽面纹鼎。鼎原是炊器，自夏商起升格为政权与礼制的象征，天子九鼎、诸侯七鼎，等级森严。", "en": "We begin with the ding tripod. Once a cooking vessel, it was elevated into a symbol of political and ritual authority: nine cauldrons for the Son of Heaven, seven for a duke." } },
    { "exhibitId": "gui-fang", "walkTo": [-4.4, -2], "lookAt": [-6.5, -2], "triggerRadius": 2.5,
      "audio": { "zh": "gui-fang-zh.mp3", "en": "gui-fang-en.mp3" },
      "subtitle": { "zh": "方座簋是西周礼制的典型器。圆簋下方加一方座，天圆地方的宇宙观被铸进了一组食器里。", "en": "The gui with square base epitomises Western Zhou ritual. A square plinth beneath the round vessel casts the cosmology of round heaven and square earth into bronze." } },
    { "exhibitId": "hu-lei", "walkTo": [-8.4, -4.5], "lookAt": [-10.6, -4.5], "triggerRadius": 2.5,
      "audio": { "zh": "hu-lei-zh.mp3", "en": "hu-lei-en.mp3" },
      "subtitle": { "zh": "壶是盛酒之器。投壶之礼，宾主依次向壶中投矢，胜者饮酒——宴饮之中亦有秩序。", "en": "The hu held wine. In the pitch-pot ceremony, guests tossed arrows into the vessel from a set distance; the loser drank. Even banquets obeyed order." } },
    { "exhibitId": "bianzhong", "walkTo": [-8.4, -1.5], "lookAt": [-10.6, -1.5], "triggerRadius": 2.5,
      "audio": { "zh": "bianzhong-zh.mp3", "en": "bianzhong-en.mp3" },
      "subtitle": { "zh": "编钟为礼乐重器。一钟双音，敲击正鼓与侧鼓可得相隔三度的两音，曾侯乙编钟至今音律不衰。", "en": "Bianzhong bells anchor ritual music. Each bell sounds two tones a minor third apart depending on where it is struck — the Marquis Yi ensemble still holds its pitch after 2,400 years." } },
    { "exhibitId": "yu-bi", "walkTo": [0, -2], "lookAt": [0, -4], "triggerRadius": 2.5,
      "audio": { "zh": "yu-bi-zh.mp3", "en": "yu-bi-en.mp3" },
      "subtitle": { "zh": "礼玉之首为璧。以苍璧礼天，璧的中孔象征天穹，是周代玉礼器中等级最高的一件。", "en": "Among ritual jades the bi disc ranks first: used to pay respects to Heaven, its central aperture standing for the vault of the sky." } }
  ]
}
```

`content/routes/song-elegance.json`：

```json
{
  "id": "song-elegance",
  "title": { "zh": "宋代雅趣生活", "en": "Song Dynasty Elegance" },
  "nodes": [
    { "exhibitId": "meiping-qinghua", "walkTo": [4.4, 3], "lookAt": [6.5, 3], "triggerRadius": 2.5,
      "audio": { "zh": "meiping-qinghua-zh.mp3", "en": "meiping-qinghua-en.mp3" },
      "subtitle": { "zh": "梅瓶小口丰肩，原为酒器，入宋后转为陈设。一瓶一花，是宋人书斋的第一清供。", "en": "The meiping's small mouth and broad shoulders once served wine; by the Song it became display furniture — a single plum branch is the first pure ornament of a scholar's studio." } },
    { "exhibitId": "yaozhou-wan", "walkTo": [4.4, -2], "lookAt": [6.5, -2], "triggerRadius": 2.5,
      "audio": { "zh": "yaozhou-wan-zh.mp3", "en": "yaozhou-wan-en.mp3" },
      "subtitle": { "zh": "耀州窑斗笠碗以刻花取胜，刀法在一毫米的胎壁上起伏，所谓'入窑一色，出窑万彩'。", "en": "Yaozhou conical bowls win by carved decoration, the chisel rippling across a wall one millimetre thick — in the kiln one colour, out of the kiln ten thousand hues." } },
    { "exhibitId": "xuanhe-lu", "walkTo": [8.4, 2], "lookAt": [10.6, 2], "triggerRadius": 2.5,
      "audio": { "zh": "xuanhe-lu-zh.mp3", "en": "xuanhe-lu-en.mp3" },
      "subtitle": { "zh": "焚香、点茶、挂画、插花，宋人四般闲事。宣和炉仿自青铜，铜素无纹，以造型本身为纹。", "en": "Burning incense, whisking tea, hanging paintings, arranging flowers — the four elegant idles of Song life. This censer copies bronze, its plain copper surface letting silhouette itself be the ornament." } }
  ]
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run shared` — Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared content/routes
git commit -m "feat(shared,content): tour route schema and two built-in routes"
```

---

### Task 2: inspectCamera 纯数学模块（TDD）

**Files:**
- Create: `web/src/viewer/inspectCamera.ts`
- Create: `web/test/inspectCamera.test.ts`

**Interfaces:**
- Produces（Task 4/5 依赖，签名逐字使用）:

```ts
export interface OrbitState { target: [number, number, number]; radius: number; azim: number; polar: number }
export type ViewpointName = 'full' | 'top' | 'rim' | 'bottom';
export const ORBIT_LIMITS: { minR: number; maxR: number; minPolar: number; maxPolar: number };
export function clampOrbit(s: OrbitState): OrbitState;
export function orbitPosition(s: OrbitState): [number, number, number];
export function easeInOut(t: number): number;
export function lerpAngle(a: number, b: number, t: number): number;
export function orbitLerp(a: OrbitState, b: OrbitState, t: number): OrbitState;
export function orbitFromCamera(camPos: [number, number, number], target: [number, number, number]): OrbitState;
export function viewpoint(name: ViewpointName, base: OrbitState): OrbitState;
```

- [ ] **Step 1: 写失败测试** `web/test/inspectCamera.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  ORBIT_LIMITS, clampOrbit, easeInOut, lerpAngle, orbitFromCamera,
  orbitLerp, orbitPosition, viewpoint
} from '../src/viewer/inspectCamera';

describe('inspectCamera', () => {
  it('orbitPosition places camera above target at polar=0 and at radius distance', () => {
    const p = orbitPosition({ target: [1, 2, 3], radius: 2, azim: 0, polar: 0 });
    expect(p[0]).toBeCloseTo(1); expect(p[1]).toBeCloseTo(4); expect(p[2]).toBeCloseTo(3);
    const q = orbitPosition({ target: [0, 0, 0], radius: 1.5, azim: 0, polar: Math.PI / 2 });
    expect(Math.hypot(...q)).toBeCloseTo(1.5);
  });
  it('clampOrbit enforces radius and polar limits', () => {
    const s = clampOrbit({ target: [0, 0, 0], radius: 99, azim: 0, polar: 9 });
    expect(s.radius).toBe(ORBIT_LIMITS.maxR);
    expect(s.polar).toBeLessThanOrEqual(ORBIT_LIMITS.maxPolar);
    expect(clampOrbit({ target: [0, 0, 0], radius: 0.001, azim: 0, polar: 0 }).radius).toBe(ORBIT_LIMITS.minR);
  });
  it('orbitFromCamera inverts orbitPosition', () => {
    const base = { target: [1, 1, 1] as [number, number, number], radius: 2, azim: 0.7, polar: 1.2 };
    const back = orbitFromCamera(orbitPosition(base), base.target);
    expect(back.radius).toBeCloseTo(base.radius);
    expect(back.azim).toBeCloseTo(base.azim);
    expect(back.polar).toBeCloseTo(base.polar);
  });
  it('lerpAngle takes the shortest way around', () => {
    expect(lerpAngle(0.1, Math.PI * 2 - 0.1, 0.5)).toBeCloseTo(0);
  });
  it('orbitLerp endpoints match easeInOut(0/1)', () => {
    const a = { target: [0, 0, 0] as [number, number, number], radius: 2, azim: 0, polar: 1.2 };
    const b = { target: [0, 1, 0] as [number, number, number], radius: 1, azim: 1, polar: 1.6 };
    expect(orbitLerp(a, b, 0).radius).toBeCloseTo(a.radius);
    expect(orbitLerp(a, b, 1).radius).toBeCloseTo(b.radius);
    expect(orbitLerp(a, b, 1).target[1]).toBeCloseTo(b.target[1]);
  });
  it('easeInOut is monotone and pinned at 0/1', () => {
    expect(easeInOut(0)).toBe(0); expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-5)).toBe(0); expect(easeInOut(5)).toBe(1);
    expect(easeInOut(0.25)).toBeLessThan(easeInOut(0.75));
  });
  it('viewpoint presets differ and stay within limits', () => {
    const base = { target: [0, 1, 0] as [number, number, number], radius: 2, azim: 0, polar: 1.2 };
    const names = ['full', 'top', 'rim', 'bottom'] as const;
    const radii = names.map(n => viewpoint(n, base).radius);
    expect(new Set(radii).size).toBeGreaterThan(1);
    for (const n of names) {
      const v = viewpoint(n, base);
      expect(v.radius).toBeGreaterThanOrEqual(ORBIT_LIMITS.minR);
      expect(v.polar).toBeGreaterThanOrEqual(ORBIT_LIMITS.minPolar);
    }
    expect(viewpoint('bottom', base).polar).toBeGreaterThan(Math.PI / 2);
    expect(viewpoint('top', base).polar).toBeLessThan(Math.PI / 4);
  });
});
```

- [ ] **Step 2: 跑测试确认失败** Run: `npx vitest run web/test/inspectCamera.test.ts` — Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现** `web/src/viewer/inspectCamera.ts`

```ts
export interface OrbitState { target: [number, number, number]; radius: number; azim: number; polar: number }
export type ViewpointName = 'full' | 'top' | 'rim' | 'bottom';

export const ORBIT_LIMITS = { minR: 0.14, maxR: 3.2, minPolar: 0.15, maxPolar: 2.9 };

export function clampOrbit(s: OrbitState): OrbitState {
  return {
    target: s.target,
    radius: Math.min(ORBIT_LIMITS.maxR, Math.max(ORBIT_LIMITS.minR, s.radius)),
    azim: s.azim,
    polar: Math.min(ORBIT_LIMITS.maxPolar, Math.max(ORBIT_LIMITS.minPolar, s.polar))
  };
}

export function orbitPosition(s: OrbitState): [number, number, number] {
  const [tx, ty, tz] = s.target;
  return [
    tx + s.radius * Math.sin(s.polar) * Math.sin(s.azim),
    ty + s.radius * Math.cos(s.polar),
    tz + s.radius * Math.sin(s.polar) * Math.cos(s.azim)
  ];
}

export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function orbitLerp(a: OrbitState, b: OrbitState, t: number): OrbitState {
  const k = easeInOut(t);
  return clampOrbit({
    target: [
      a.target[0] + (b.target[0] - a.target[0]) * k,
      a.target[1] + (b.target[1] - a.target[1]) * k,
      a.target[2] + (b.target[2] - a.target[2]) * k
    ],
    radius: a.radius + (b.radius - a.radius) * k,
    azim: lerpAngle(a.azim, b.azim, k),
    polar: a.polar + (b.polar - a.polar) * k
  });
}

export function orbitFromCamera(camPos: [number, number, number], target: [number, number, number]): OrbitState {
  const dx = camPos[0] - target[0], dy = camPos[1] - target[1], dz = camPos[2] - target[2];
  const r = Math.max(Math.hypot(dx, dy, dz), 1e-6);
  return clampOrbit({ target, radius: r, azim: Math.atan2(dx, dz), polar: Math.acos(Math.min(1, Math.max(-1, dy / r))) });
}

const PRESETS: Record<ViewpointName, { radius: number; polar: number }> = {
  full: { radius: 2.2, polar: 1.25 },
  top: { radius: 1.6, polar: 0.25 },
  rim: { radius: 0.8, polar: Math.PI / 2 },
  bottom: { radius: 1.0, polar: 2.75 }
};

export function viewpoint(name: ViewpointName, base: OrbitState): OrbitState {
  return clampOrbit({ ...base, ...PRESETS[name] });
}
```

- [ ] **Step 4: 跑测试确认通过** Run: `npx vitest run web/test/inspectCamera.test.ts` — Expected: PASS（8 用例）

- [ ] **Step 5: Commit**

```bash
git add web/src/viewer/inspectCamera.ts web/test/inspectCamera.test.ts
git commit -m "feat(web): orbit math for inspect mode (TDD)"
```

---

### Task 3: tourPath 纯状态机模块（TDD）

**Files:**
- Create: `web/src/viewer/tourPath.ts`
- Create: `web/test/tourPath.test.ts`

**Interfaces:**
- Consumes: `TourRoute`（Task 1）
- Produces（Task 6 依赖，签名逐字使用）:

```ts
export interface XZ { x: number; z: number }
export type TourPhase = 'walk' | 'face' | 'present' | 'dwell' | 'done';
export interface TourState { node: number; segT: number; phase: TourPhase; faceT: number; dwellLeft: number }
export type TourEvent = 'arrived' | 'departed' | 'finished';
export const WALK_SPEED: number;              // m/s，导览步速
export const DWELL_SEC: number;               // 讲完停留秒数（2）
export function createTourState(node?: number): TourState;
export function sampleSegment(route: TourRoute, i: number, t: number): XZ;
export function yawTowards(from: XZ, to: XZ): number;
export function tourAdvance(state: TourState, route: TourRoute, speaking: boolean, dt: number): { next: TourState; pos: XZ; events: TourEvent[] };
```

行为约定（写进测试）：
- `walk`：沿第 i 段 Catmull-Rom（控制点取相邻 walkTo，端点钳制）从 segT→1；到达后转 `face`（0.8s 转头对准 lookAt）→ `present` 并发 `arrived`（此时 dwellLeft=DWELL_SEC 起计）
- `present`：`speaking=true` 时停留不计时；`speaking=false` 后 dwellLeft 递减，归零发 `departed` 转 `dwell`→立即进入下一段 `walk`（node+1，segT=0）；最后一名节点讲完发 `finished` 转 `done`
- `createTourState(0)` 初始 phase 为 `face`（首站无需走路，直接转头开讲）

- [ ] **Step 1: 写失败测试** `web/test/tourPath.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { TourRoute } from '@museum/shared';
import { DWELL_SEC, createTourState, sampleSegment, tourAdvance, yawTowards } from '../src/viewer/tourPath';

const route: TourRoute = {
  id: 'r', title: { zh: 't', en: 't' },
  nodes: [
    { exhibitId: 'a', walkTo: [-4, 3], lookAt: [-6, 3], triggerRadius: 2, audio: {}, subtitle: { zh: '甲', en: 'A' } },
    { exhibitId: 'b', walkTo: [-4, -2], lookAt: [-6, -2], triggerRadius: 2, audio: {}, subtitle: { zh: '乙', en: 'B' } },
    { exhibitId: 'c', walkTo: [0, -4], lookAt: [0, -6], triggerRadius: 2, audio: {}, subtitle: { zh: '丙', en: 'C' } }
  ]
};

describe('tourPath', () => {
  it('sampleSegment interpolates endpoints of each segment', () => {
    const s0 = sampleSegment(route, 0, 0);
    expect(s0.x).toBeCloseTo(-4, 0); expect(s0.z).toBeCloseTo(3, 0);
    const s0e = sampleSegment(route, 0, 1);
    expect(s0e.x).toBeCloseTo(-4, 0); expect(s0e.z).toBeCloseTo(-2, 0);
    const s1 = sampleSegment(route, 1, 1);
    expect(s1.x).toBeCloseTo(0, 0); expect(s1.z).toBeCloseTo(-4, 0);
  });
  it('yawTowards follows roam convention (-sin,-cos)', () => {
    expect(yawTowards({ x: 0, z: 0 }, { x: 0, z: -1 })).toBeCloseTo(0);      // -Z 前方 → yaw 0
    expect(yawTowards({ x: 0, z: 0 }, { x: -1, z: 0 })).toBeCloseTo(Math.PI / 2); // -X → +90°
  });
  it('first node faces then presents without walking', () => {
    let { next, events } = tourAdvance(createTourState(0), route, false, 1.0);
    expect(events).toContain('arrived');
    expect(next.phase).toBe('present');
    expect(next.node).toBe(0);
  });
  it('present waits for speech, dwells, then departs to next node', () => {
    let st = createTourState(0);
    ({ next: st } = tourAdvance(st, route, false, 1.0));            // → present
    let r = tourAdvance(st, route, true, 1.0);                       // speaking: hold
    expect(r.next.phase).toBe('present');
    expect(r.next.dwellLeft).toBe(DWELL_SEC);
    for (let i = 0; i < 40 && r.next.phase === 'present'; i++) r = tourAdvance(r.next, route, false, 0.1);
    expect(r.events).toContain('departed');
    expect(r.next.node).toBe(1);
    expect(r.next.phase).toBe('walk');
  });
  it('walking reaches node 1 then arrives; last node finishes', () => {
    let st = { ...createTourState(1), phase: 'walk' as const };
    for (let i = 0; i < 200 && !st.phase.includes('present'); i++) {
      const r = tourAdvance(st, route, false, 0.1);
      st = r.next;
    }
    expect(st.phase).toBe('present');
    let r = tourAdvance(st, route, false, 0.1);
    while (r.next.node === 2 && r.next.phase !== 'done') r = tourAdvance(r.next, route, false, 0.5);
    expect(r.events).toContain('finished');
    expect(r.next.phase).toBe('done');
  });
});
```

- [ ] **Step 2: 跑测试确认失败** Run: `npx vitest run web/test/tourPath.test.ts` — Expected: FAIL

- [ ] **Step 3: 实现** `web/src/viewer/tourPath.ts`

```ts
import type { TourRoute } from '@museum/shared';

export interface XZ { x: number; z: number }
export type TourPhase = 'walk' | 'face' | 'present' | 'dwell' | 'done';
export interface TourState { node: number; segT: number; phase: TourPhase; faceT: number; dwellLeft: number }
export type TourEvent = 'arrived' | 'departed' | 'finished';

export const WALK_SPEED = 1.6;
export const DWELL_SEC = 2;
const FACE_SEC = 0.8;

export function createTourState(node = 0): TourState {
  return { node, segT: 0, phase: node === 0 ? 'face' : 'walk', faceT: 0, dwellLeft: DWELL_SEC };
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function sampleSegment(route: TourRoute, i: number, t: number): XZ {
  const pts = route.nodes.map(n => n.walkTo);
  const at = (k: number) => pts[Math.min(pts.length - 1, Math.max(0, k))];
  const [p0x, p0z] = at(i - 1), [p1x, p1z] = at(i), [p2x, p2z] = at(i + 1), [p3x, p3z] = at(i + 2);
  return { x: catmull(p0x, p1x, p2x, p3x, t), z: catmull(p0z, p1z, p2z, p3z, t) };
}

export function yawTowards(from: XZ, to: XZ): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

function segmentLength(route: TourRoute, i: number): number {
  let len = 0, prev = sampleSegment(route, i, 0);
  for (let k = 1; k <= 10; k++) {
    const p = sampleSegment(route, i, k / 10);
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return Math.max(len, 0.01);
}

export function tourAdvance(
  state: TourState, route: TourRoute, speaking: boolean, dt: number
): { next: TourState; pos: XZ; events: TourEvent[] } {
  const events: TourEvent[] = [];
  const s: TourState = { ...state };
  const last = route.nodes.length - 1;
  const node = route.nodes[Math.min(s.node, last)];
  let pos = sampleSegment(route, Math.min(s.node, last), Math.min(s.segT, 1));

  switch (s.phase) {
    case 'walk': {
      s.segT += (WALK_SPEED * dt) / segmentLength(route, s.node);
      if (s.segT >= 1) { s.segT = 1; s.phase = 'face'; s.faceT = 0; }
      pos = sampleSegment(route, s.node, s.segT);
      break;
    }
    case 'face': {
      s.faceT += dt / FACE_SEC;
      pos = sampleSegment(route, s.node, 1);
      if (s.faceT >= 1) { s.faceT = 1; s.phase = 'present'; s.dwellLeft = DWELL_SEC; events.push('arrived'); }
      break;
    }
    case 'present': {
      pos = sampleSegment(route, s.node, 1);
      if (!speaking) {
        s.dwellLeft -= dt;
        if (s.dwellLeft <= 0) {
          events.push('departed');
          s.phase = 'dwell';
        }
      }
      break;
    }
    case 'dwell': {
      pos = sampleSegment(route, s.node, 1);
      if (s.node >= last) { s.phase = 'done'; events.push('finished'); }
      else { s.node += 1; s.segT = 0; s.phase = 'walk'; }
      break;
    }
    case 'done': break;
  }
  return { next: s, pos, events };
}
```

- [ ] **Step 4: 跑测试确认通过** Run: `npx vitest run web/test/tourPath.test.ts` — Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/viewer/tourPath.ts web/test/tourPath.test.ts
git commit -m "feat(web): tour state machine with spline walking (TDD)"
```

---

### Task 4: 鉴赏模式接入（MuseumViewer + ViewerPage UI）

**Files:**
- Modify: `web/src/viewer/MuseumViewer.ts`
- Modify: `web/src/pages/ViewerPage.tsx`

**Interfaces:**
- Consumes: Task 2 全部导出；现有 `setSelected`
- Produces（MuseumViewer 新公共 API，Task 5/6/7 依赖）:

```ts
enterInspect(placementId: string): void;   // 0.8s 飞入特写轨道（viewpoint 'full'）
exitInspect(): void;                        // 恢复漫游相机
setInspectView(name: ViewpointName): void;  // 视角切换：0.6s 缓动到预设
setFillLight(azimRad: number, intensity: number): void; // 补光条
mode: 'roam' | 'inspect';                   // 只读属性
// ViewerOptions 追加可选回调：
onModeChange?: (mode: 'roam' | 'inspect') => void;
```

实现要点（全部在 MuseumViewer 内）：
1. 新字段：`private modeInner: 'roam' | 'inspect' = 'roam'`、`orbit/orbitGoal: OrbitState | null`、`orbitFly: { from: OrbitState; t: number; dur: number } | null`、`inspectLight: THREE.DirectionalLight`（构造时创建，`visible=false`）、`savedRoam: { pos: XZ; yaw: number; pitch: number } | null`、`savedLights: { hemi: number; sun: number; env: number } | null`
2. `enterInspect(id)`：找到 group → `Box3.setFromObject` 取中心为 target；`orbit = orbitFromCamera(当前相机位置, target)`，`orbitGoal = viewpoint('full', orbit)`，`orbitFly = { from: orbit, t: 0, dur: 0.8 }`；保存 `savedRoam`；压暗：`hemi.intensity *= 0.35`、`sun.intensity *= 0.25`、`scene.environmentIntensity = 0.12`；`inspectLight.visible = true`；`setSelected(id)`（复用光环+自转）；`opts.onModeChange?.('inspect')`
3. `exitInspect()`：还原 savedRoam/savedLights；`orbit = null; inspectLight.visible = false`；`setSelected(null)`；onModeChange('roam')；**与导览联动**（spec §5 退出）：若导览存在且是因进入鉴赏而暂停的（`tourPausedByInspect` 标志），退出时 `resumeTour()` 从当前节点续播
4. 输入分流：`pointermove` 拖拽在 inspect 下改为写 `orbitGoal.azim -= dx*0.005; orbitGoal.polar -= dy*0.005`（clampOrbit），loop 内 `orbit = dampOrbit(orbit, orbitGoal)` 实现惯性阻尼（azim/polar/radius 各按 `damp(cur, goal, 10, dt)`，复用 movement.damp）；新增 `wheel` 监听（inspect 下 `orbitGoal.radius *= Math.exp(e.deltaY * 0.001)`，`preventDefault`，`passive: false`）；**双指捏合缩放**：维护 `Map<pointerId, {x,y}>` 活动指针，2 指时以指距变化率驱动同一个 `orbitGoal.radius`（与滚轮同一条公式），满足移动端"抵近观察"
5. `loop()` 相机分派：inspect 时若 orbitFly 未完成则 `orbit = orbitLerp(from, goal, t/dur)` 推进 t 且同步 goal=orbit；否则走 4 的阻尼跟随；`camera.position.set(...orbitPosition(orbit))`，`camera.lookAt(...orbit.target)`；`inspectLight.position` 每帧取 `orbitPosition({...orbit, azim: orbit.azim + fillAzim})` 抬高 0.5；选中自转逻辑在 inspect 下停用（用户手动环绕）。**4K 贴图近距切换**对程序化占位模型无意义，留待真实模型接入后另立任务（spec 4.4/5 的贴图分级）
6. `setInspectView(name)`：`orbitGoal = viewpoint(name, orbit)`，`orbitFly = { from: orbit, t: 0, dur: 0.6 }`
7. `setFillLight(azimRad, intensity)`：记 `fillAzim`，`inspectLight.intensity = intensity`
8. `dispose()`：移除 wheel 监听

ViewerPage UI（React 层）：
- `const [mode, setMode] = useState<'roam'|'inspect'>('roam')`，MuseumViewer options 传 `onModeChange: setMode`
- 信息面板加"进入鉴赏"按钮 → `viewerRef.current?.enterInspect(selected.placement.id)`
- `mode === 'inspect'` 时右侧面板替换为鉴赏工具条：四按钮（全貌/俯瞰/口沿/底部 → `setInspectView`）、补光方位滑杆 0~360° + 强度滑杆 0~6（`setFillLight`）、"退出鉴赏"按钮（`exitInspect()`）
- `useEffect` 监听 keydown `Escape` → inspect 下 `exitInspect()`

- [ ] **Step 1: MuseumViewer 增加 inspect 状态机与输入分流**（按上方要点 1~8 编码）
- [ ] **Step 2: ViewerPage 鉴赏 UI**（按钮/滑杆/Esc）
- [ ] **Step 3: 验证** Run: `npm run typecheck && npm test` — Expected: 全绿（本任务无新纯函数，UI 走浏览器验收）
- [ ] **Step 4: 浏览器手动验收**（dev 5173）：点击文物→进入鉴赏→拖拽环绕→滚轮抵近（半径下限 0.14 不穿模）→四个视角按钮→补光滑杆可见浮雕层次→Esc 退出回到漫游位
- [ ] **Step 5: Commit** `git commit -am "feat(web): inspect mode with orbit camera, viewpoint presets and fill light"`

---

### Task 5: 细节热点（数据 + Sprite + 点击飞入 + 说明卡）

**Files:**
- Modify: `content/exhibits/guan-ding.json`、`meiping-qinghua.json`、`yu-bi.json`（补 hotspots）
- Modify: `web/src/viewer/painter.ts`（`makeHotspotTexture()`）
- Modify: `web/src/viewer/MuseumViewer.ts`
- Modify: `web/src/pages/ViewerPage.tsx`

**Interfaces:**
- Consumes: `ExhibitSchema.hotspots`（已存在，`{position, normal?, title, body}`）；Task 4 的 `orbitFly`
- Produces: `ViewerOptions` 追加 `onHotspotClick?: (h: Hotspot | null) => void`

- [ ] **Step 1: 补热点数据**（坐标为模型局部系，程序化模型高约 1.1~1.4m）

`guan-ding.json`：

```json
"hotspots": [
  { "position": [0, 0.06, 0], "title": { "zh": "底款", "en": "Inscription" }, "body": { "zh": "器底铸铭文四字，记王室赏赐之事。", "en": "Four characters cast into the base record a royal grant." } },
  { "position": [0.5, 0.45, 0.3], "title": { "zh": "兽面纹带", "en": "Taotie Band" }, "body": { "zh": "腹部主纹为兽面纹，以云雷纹为地。", "en": "The body carries a taotie mask over a cloud-and-thunder ground." } }
]
```

`meiping-qinghua.json`：

```json
"hotspots": [
  { "position": [0, 1.33, 0.16], "title": { "zh": "口沿", "en": "Rim" }, "body": { "zh": "小口圆唇，唇线一圈青花弦纹。", "en": "A small round lip encircled by a cobalt string band." } },
  { "position": [0.48, 0.6, 0.1], "title": { "zh": "缠枝纹", "en": "Scroll Pattern" }, "body": { "zh": "肩腹绘缠枝花卉，青料浓处可见铁锈斑。", "en": "Interlocking scrolls sweep the shoulder; the thick cobalt shows rust-coloured spots." } }
]
```

`yu-bi.json`：

```json
"hotspots": [
  { "position": [0.55, 0.6, 0.14], "title": { "zh": "谷纹", "en": "Grain Motif" }, "body": { "zh": "璧面满布乳突状谷纹，排列齐整如禾苗初生。", "en": "The disc is carpeted with raised grain dots, neat as seedlings." } }
]
```

- [ ] **Step 2: painter.ts 追加**

```ts
export function makeHotspotTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(217,180,90,0.9)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#3a2c0e'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('+', 32, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

- [ ] **Step 3: MuseumViewer 渲染与拾取**

`addExhibit` 内（拿到 exhibit 后）：`exhibit.hotspots.map(h => new THREE.Sprite(new THREE.SpriteMaterial({ map: hotspotTex, depthTest: false, transparent: true })))`，`scale.setScalar(0.09)`，`position.fromArray(h.position)`，`userData.hotspot = h`，加入 model group；`hotspotTex` 构造时建一次并 push 进 `this.textures`。
`pick()`：inspect 模式下先 `intersectObjects(spriteList)`（命中即 `opts.onHotspotClick?.(h)` 并 `flyToHotspot(h)`：`orbitGoal = clampOrbit({...orbit, target: 世界坐标(h.position, model.localToWorld), radius: 0.35})` + orbitFly 0.6s），未命中再走展品拾取。

- [ ] **Step 4: ViewerPage 说明卡**

`onHotspotClick: h => setHotspot(h)`；inspect 面板底部渲染卡片：title（按 lang）、body、"知道了"按钮 `setHotspot(null)`。

- [ ] **Step 5: 验证 + Commit**

Run: `npm run typecheck && npm test` → 全绿；浏览器：鼎进入鉴赏→点"底款"热点→相机飞至底部→说明卡出现。
`git commit -am "feat(web): detail hotspots with camera fly-in"`

---

### Task 6: 智能导览接入（自动漫游 + 控制条 + 手动输入暂停）

**Files:**
- Modify: `web/src/viewer/MuseumViewer.ts`
- Modify: `web/src/pages/ViewerPage.tsx`

**Interfaces:**
- Consumes: Task 3 全部导出；Task 1 `TourRoute`
- Produces（MuseumViewer 新公共 API，Task 7 依赖）:

```ts
startTour(route: TourRoute): void;
stopTour(): void;
pauseTour(): void;
resumeTour(): void;
tourJump(nodeIndex: number): void;   // 上一站/下一站：直接传送到该节点 face 阶段
tourNarrationDone(): void;           // UI 告知本站讲解播完（进入 dwell 计时）
tourActive: boolean;                 // 只读
// ViewerOptions 追加：
onTourNode?: (nodeIndex: number) => void;   // 'arrived' 事件转发
onTourAutoPause?: () => void;               // 用户手动输入导致暂停
onTourEnd?: () => void;
```

实现要点：
1. 字段：`private tour: { route: TourRoute; state: TourState; paused: boolean; speaking: boolean } | null = null`
2. `loop()` 中 tour 激活且未暂停时：`tourAdvance(state, route, speaking, dt)` → `this.pos = outcome.pos`（不走碰撞，路线坐标已避开展柜）；`yawTarget`：walk 阶段取下一采样点方向 `yawTowards(pos, sample(t+0.05))`，face/present 阶段取 `yawTowards(pos, node.lookAt)`；events 含 `arrived` → `speaking = true; opts.onTourNode?.(node)`；含 `finished` → `opts.onTourEnd?.()`、tour 置 null
3. `tourNarrationDone()`：`tour.speaking = false`（dwell 开始计时）
4. 手动输入暂停：`bindInput` 的 keydown（WASD/箭头）与 pointerdown 拖拽起点处，若 tour 激活且未暂停 → `pauseTour(); opts.onTourAutoPause?.()`
5. `tourJump(i)`：`state = createTourState(i)`，同时把 `this.pos` 直接设为 `sampleSegment(route, i, 1)`
6. `startTour`：`tour = { route, state: createTourState(0), paused: false, speaking: false }`；首节点即 face→arrived
7. `stopTour`：tour 置 null，相机保持当前位置继续漫游

ViewerPage UI：
- 顶栏加路线下拉（App 需把 routes 数据传下来，见下）+"开始导览"按钮 → `viewer.startTour(route)`；`tourActive` 时替换为控制条：`⏸/▶`（pause/resume）、`⏮ 上一站`（tourJump(node-1)）、`下一站 ⏭`、`✕ 退出`；节点进度显示"第 i/n 站"
- `onTourAutoPause` → 显示提示条"已暂停导览 [继续跟随]"，按钮调 `resumeTour()`
- App.tsx：加载 `/content/routes/index.json` 后并发拉取各 `routes/<id>.json`，`routes: TourRoute[]` 传入 ViewerPage

- [ ] **Step 1: MuseumViewer 导览驱动**（要点 1~6）
- [ ] **Step 2: App/ViewerPage UI**（路线下拉、控制条、暂停提示）
- [ ] **Step 3: 验证** `npm run typecheck && npm test`；浏览器：选"青铜礼制脉络"→开始→零操作跟随走完 5 站→自动结束回漫游；中途按 W → 弹暂停提示→继续跟随
- [ ] **Step 4: Commit** `git commit -am "feat(web): auto tour driving along spline with node events and manual-input pause"`

---

### Task 7: 讲解音频 + 双语字幕 + 语言切换

**Files:**
- Modify: `web/src/pages/ViewerPage.tsx`
- Create: `web/src/viewer/narration.ts`（纯逻辑：降级计时器）
- Create: `web/test/narration.test.ts`

**Interfaces:**
- Produces:

```ts
// narration.ts
export function fallbackDurationMs(text: string): number; // 中文≈4字/秒，英文≈14字符/秒；下限 3000
export function createNarration(
  playAudio: (url: string) => Promise<boolean>,  // 返回 false 表示 404/解码失败
  onDone: () => void
): { start(file: string | undefined, subtitle: string, lang: 'zh' | 'en'): void; stop(): void };
```

- [ ] **Step 1: 写失败测试** `web/test/narration.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { createNarration, fallbackDurationMs } from '../src/viewer/narration';

describe('narration', () => {
  it('falls back to subtitle-length timer when audio missing', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const n = createNarration(async () => false, onDone);
    n.start('a-zh.mp3', '这是一段测试字幕文本', 'zh');
    await vi.advanceTimersByTimeAsync(fallbackDurationMs('这是一段测试字幕文本') + 10);
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
  it('does not fire done while audio plays successfully', async () => {
    const onDone = vi.fn();
    const n = createNarration(() => new Promise<boolean>(() => {}), onDone);
    n.start('a-zh.mp3', '文本', 'zh');
    await Promise.resolve();
    expect(onDone).not.toHaveBeenCalled();
  });
  it('fallbackDurationMs scales with text and has a floor', () => {
    expect(fallbackDurationMs('一二三四')).toBeGreaterThanOrEqual(3000);
    expect(fallbackDurationMs('一'.repeat(40))).toBeGreaterThan(fallbackDurationMs('一'.repeat(10)));
  });
});
```

- [ ] **Step 2: 确认失败 → 实现 narration.ts**

```ts
export function fallbackDurationMs(text: string): number {
  const perChar = /[\u4e00-\u9fff]/.test(text) ? 250 : 70;
  return Math.max(3000, text.length * perChar);
}

export function createNarration(
  playAudio: (url: string) => Promise<boolean>, onDone: () => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  return {
    start(file: string | undefined, subtitle: string, lang: 'zh' | 'en') {
      this.stop(); cancelled = false;
      const url = file ? `/content/audio/${file}` : '';
      void playAudio(url).then(ok => {
        if (cancelled) return;
        if (!ok) timer = setTimeout(onDone, fallbackDurationMs(subtitle));
      });
      if (!file) timer = timer ?? setTimeout(onDone, fallbackDurationMs(subtitle));
    },
    stop() { cancelled = true; if (timer) clearTimeout(timer); timer = null; }
  };
}
```

（`playAudio` 在 ViewerPage 里实现：`new Audio(url)`，`canplaythrough`→resolve true 并在 `ended` 时调 onDone；`error`/404→resolve false。测试只测纯降级逻辑。）

- [ ] **Step 3: ViewerPage 接线**

- `lang` state（'zh'|'en'，顶栏按钮切换）；`subtitleMode` state（'zh'|'en'|'both'，导览设置下拉）
- `onTourNode: i => { const node = tour.nodes[i]; narration.start(lang === 'zh' ? node.audio.zh : node.audio.en, node.subtitle[lang], lang); setSubtitle(node.subtitle); }`；narration 的 `onDone` → `viewerRef.current?.tourNarrationDone()`
- 字幕条：屏幕底部半透明黑条，按 subtitleMode 渲染一行或两行；`stopTour`/`tourJump` 时 `narration.stop()` 清字幕
- 鉴赏面板与说明卡文字按 `lang` 取 `name.zh/en`、`title.zh/en`

- [ ] **Step 4: 验证** `npx vitest run web/test/narration.test.ts` 绿；浏览器：开始导览→无音频文件时字幕按字数计时、2s 后自动下一站；切英文→字幕英文、计时用英文长度
- [ ] **Step 5: Commit** `git commit -am "feat(web): narration with audio slots, subtitle fallback and language toggle"`

---

### Task 8: 回归验证 + 包体 + 文档 + 收尾提交

- [ ] **Step 1:** `npm run typecheck && npm test` 全绿（预计 ~85 用例）
- [ ] **Step 2:** `npm run build && node scripts/budget.mjs` — 预算 400KB 内（当前 196.2KB，本计划无新依赖，预计 +5KB 内）
- [ ] **Step 3:** 停 dev、`npm run start` 生产模式 3001，浏览器完整走一遍：漫游→点击鼎→鉴赏四视角→底款热点→退出→选路线开始导览→零操作看完青铜线→中途拖拽鼠标触发暂停提示→继续→结束
- [ ] **Step 4:** README"当前状态"改为"计划 2（鉴赏模式+智能导览）已完成"，操作方式补充鉴赏/导览说明；`git commit -am "docs: plan 2 finished"`
- [ ] **Step 5:** 更新项目记忆（计划 2 完成、测试数、验收结论）

## 验收清单（人工浏览器）

- [ ] 抵近观察：滚轮推到最近不出错、不穿模（minR 0.14m ≈ 贴面）
- [ ] 视角切换：全貌/俯瞰/口沿/底部四按钮均 0.6s 缓动到位，底部视角能看底款
- [ ] 热点：金色 + 圆点悬浮于模型表面，点击飞入 + 双语说明卡
- [ ] 补光：方位/强度滑杆实时改变侧光，兽面纹带出现明暗层次
- [ ] 导览：全程零操作走完一条路线；每站转头→停留→下一站；结束自动回漫游
- [ ] 暂停/继续：任何手动键鼠输入即暂停并提示，"继续跟随"恢复
- [ ] 双语：语言切换影响字幕/说明卡；音频 404 时降级计时不卡死
- [ ] Esc 退出鉴赏回到漫游原位
