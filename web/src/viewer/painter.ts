import * as THREE from 'three';

const FONT = '"Microsoft YaHei","PingFang SC",sans-serif';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

/** 浅色抛光石材地面（博物馆常见米灰大理石，板缝 + 天然石纹） */
export function makeFloorTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 1024);
  const bg = ctx.createLinearGradient(0, 0, 1024, 1024);
  bg.addColorStop(0, '#ddd5c6'); bg.addColorStop(1, '#d2c9ba');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 1024);
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const ox = tx * 512, oy = ty * 512;
      ctx.fillStyle = `rgba(255,251,242,${0.03 + ((tx * 5 + ty * 3) % 3) * 0.02})`;
      ctx.fillRect(ox, oy, 512, 512);
      // 天然大理石脉络
      for (let v = 0; v < 9; v++) {
        ctx.strokeStyle = `rgba(${118 + v * 4},${112 + v * 4},${102 + v * 4},${0.08 + Math.random() * 0.12})`;
        ctx.lineWidth = 0.8 + Math.random() * 2.2;
        ctx.beginPath();
        let x = ox + Math.random() * 512, y = oy + Math.random() * 60;
        ctx.moveTo(x, y);
        while (y < oy + 512) {
          y += 34 + Math.random() * 62;
          x += (Math.random() - 0.5) * 96;
          ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 50, y - 30, x, y);
        }
        ctx.stroke();
      }
      // 细密石材质感噪点
      for (let i = 0; i < 5200; i++) {
        const g = 196 + Math.random() * 46;
        ctx.fillStyle = `rgba(${g},${g - 7},${g - 16},0.15)`;
        ctx.fillRect(ox + Math.random() * 512, oy + Math.random() * 512, 1.6, 1.6);
      }
    }
  }
  ctx.strokeStyle = 'rgba(150,140,122,0.85)'; ctx.lineWidth = 3;
  for (const g of [0, 512, 1024]) {
    ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(1024, g); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 米白色石膏墙面（细微颗粒与明暗斑驳） */
export function makeWallTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#d9d0bd'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 60 + Math.random() * 150;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() > 0.5;
    g.addColorStop(0, dark ? 'rgba(176,164,140,0.10)' : 'rgba(238,232,218,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 8000; i++) {
    const g = 176 + Math.random() * 66;
    ctx.fillStyle = `rgba(${g},${g - 8},${g - 24},0.07)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 深胡桃木纹（墙裙 / 画框 / 展板灯槽共用） */
export function makeWoodTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#4e3a27'; ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x++) {
    const n = Math.sin(x * 0.35) * 6 + Math.sin(x * 0.11) * 10;
    ctx.fillStyle = `rgba(${30 + Math.random() * 26},${20 + Math.random() * 18},${10 + Math.random() * 12},${0.10 + Math.abs(n) * 0.012})`;
    ctx.fillRect(x + (Math.random() - 0.5) * 2, 0, 1, 256);
  }
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(24,16,8,${0.14 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.7 + Math.random() * 1.4;
    const x = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 8, 80, x - 8, 170, x + 4, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 酒红色通道地毯（金线回纹边框） */
export function makeCarpetTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 1024);
  ctx.fillStyle = '#5e2026'; ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 26000; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? 'rgba(120,42,48,0.35)' : 'rgba(38,10,13,0.35)';
    ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2.2, 2.2);
  }
  // 暗纹菱格
  ctx.strokeStyle = 'rgba(140,90,70,0.16)'; ctx.lineWidth = 2;
  for (let z = -512; z < 1536; z += 64) {
    ctx.beginPath(); ctx.moveTo(0, z); ctx.lineTo(512, z + 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(512, z); ctx.lineTo(0, z + 512); ctx.stroke();
  }
  // 金线边框
  ctx.strokeStyle = '#b9914e'; ctx.lineWidth = 8;
  ctx.strokeRect(26, 26, 460, 972);
  ctx.lineWidth = 3; ctx.strokeRect(48, 48, 416, 928);
  ctx.fillStyle = '#b9914e';
  for (const [cx, cy] of [[48, 48], [464, 48], [48, 976], [464, 976]] as [number, number][]) {
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface PanelSpec {
  /** 中文标题（大字） */
  title: string;
  /** 中文副标题 */
  subtitle: string;
  /** 英文行：标题 + 副标题（小字衬线，排在中文副标题下方） */
  subtitleEn: string;
  body: string[];
  /** 英文正文，按像素宽度自动折行 */
  bodyEn: string;
  footer: string;
  footerEn: string;
}

/** 超宽则截断加省略号（英文题注用） */
function clampText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

/** 按像素宽度折行（英文段落用） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 讲解图文展板：宣纸底、双线框、标题金线。
 * 中文为主体、英文小字附于下方 —— 与国内博物馆双语展板一致，不随界面语言切换。
 */
export function makePanelTexture(spec: PanelSpec): THREE.CanvasTexture {
  const H = 900;
  const [c, ctx] = canvas(1024, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f7f0de'); bg.addColorStop(1, '#eae0c7');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, H);
  for (let i = 0; i < 4800; i++) {
    ctx.fillStyle = `rgba(130,108,66,${0.03 + Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * H, 1.6, 1.6);
  }
  ctx.strokeStyle = '#7a5c33'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, 984, H - 40);
  ctx.lineWidth = 2; ctx.strokeRect(36, 36, 952, H - 72);

  // 标题（中文大字 + 英文小字）
  ctx.fillStyle = '#33291a'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 56px ${FONT}`;
  ctx.fillText(spec.title, 512, 112);
  ctx.strokeStyle = '#a3823f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(340, 146); ctx.lineTo(684, 146); ctx.stroke();
  ctx.fillStyle = '#7a5c33'; ctx.font = `28px ${FONT}`;
  ctx.fillText(spec.subtitle, 512, 184);
  ctx.fillStyle = '#96866a'; ctx.font = `italic 21px Georgia,serif`;
  ctx.fillText(spec.subtitleEn, 512, 216);

  // 中文正文
  ctx.fillStyle = '#463a26'; ctx.textAlign = 'left';
  ctx.font = `27px ${FONT}`;
  spec.body.forEach((line, i) => ctx.fillText(line, 92, 272 + i * 42));

  // 中英之间的虚线分隔
  const divY = 272 + spec.body.length * 42 + 20;
  ctx.strokeStyle = 'rgba(160,140,100,0.6)'; ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(92, divY); ctx.lineTo(932, divY); ctx.stroke();
  ctx.setLineDash([]);

  // 英文正文（Georgia 衬线，自动折行）
  ctx.fillStyle = '#5d5240'; ctx.font = `19px Georgia,serif`;
  wrapText(ctx, spec.bodyEn, 840).forEach((line, i) => ctx.fillText(line, 92, divY + 38 + i * 28));

  // 页脚
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7a5c'; ctx.font = `22px ${FONT}`;
  ctx.fillText(spec.footer, 512, 810);
  ctx.fillStyle = '#a3967c'; ctx.font = `italic 17px Georgia,serif`;
  ctx.fillText(spec.footerEn, 512, 842);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 文物挂画：锦缎底 + 手绘文物插画 + 题注 */
export function makeWallArtTexture(
  kind: 'ding' | 'vase' | 'bi' | 'bowl',
  caption: { zh: string; en: string }
): THREE.CanvasTexture {
  const [c, ctx] = canvas(640, 810);
  const bg = ctx.createLinearGradient(0, 0, 0, 810);
  bg.addColorStop(0, '#f1e8d4'); bg.addColorStop(1, '#e4d8bd');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 640, 810);
  // 画心（绢底）
  ctx.fillStyle = '#e6d9bc'; ctx.fillRect(56, 56, 528, 620);
  const silk = ctx.createRadialGradient(320, 300, 40, 320, 340, 400);
  silk.addColorStop(0, 'rgba(255,250,236,0.55)'); silk.addColorStop(1, 'rgba(178,158,118,0.30)');
  ctx.fillStyle = silk; ctx.fillRect(56, 56, 528, 620);
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = `rgba(120,100,60,${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(56 + Math.random() * 528, 56 + Math.random() * 620, 1.5, 1.5);
  }
  ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 5; ctx.strokeRect(56, 56, 528, 620);

  ctx.save();
  ctx.beginPath(); ctx.rect(56, 56, 528, 620); ctx.clip();
  ctx.translate(320, 330);
  if (kind === 'ding') {
    // 青铜鼎：双耳、鼓腹、三足、饕餮纹带
    const bronze = ctx.createLinearGradient(-150, -180, 150, 180);
    bronze.addColorStop(0, '#7d8a60'); bronze.addColorStop(0.5, '#5f6d48'); bronze.addColorStop(1, '#47533a');
    ctx.fillStyle = bronze;
    for (const dx of [-1, 1]) { // 耳
      ctx.beginPath();
      ctx.moveTo(dx * 70, -120); ctx.quadraticCurveTo(dx * 105, -195, dx * 60, -205);
      ctx.quadraticCurveTo(dx * 28, -208, dx * 34, -150);
      ctx.lineTo(dx * 34, -120); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); // 腹
    ctx.moveTo(-140, -130);
    ctx.quadraticCurveTo(-165, -20, -110, 60);
    ctx.quadraticCurveTo(0, 105, 110, 60);
    ctx.quadraticCurveTo(165, -20, 140, -130);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3c452e'; ctx.lineWidth = 4;
    ctx.strokeRect(-128, -100, 256, 56); // 纹带框
    for (let i = 0; i < 6; i++) { // 饕餮纹带
      ctx.fillStyle = 'rgba(210,222,180,0.5)';
      ctx.beginPath(); ctx.arc(-100 + i * 40, -72, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(56,66,42,0.8)';
      ctx.beginPath(); ctx.arc(-100 + i * 40, -72, 6, 0, Math.PI * 2); ctx.fill();
    }
    for (const dx of [-88, 0, 88]) { // 足
      ctx.beginPath();
      ctx.moveTo(dx - 26, 78); ctx.quadraticCurveTo(dx - 16, 150, dx - 20, 190);
      ctx.lineTo(dx + 20, 190); ctx.quadraticCurveTo(dx + 16, 150, dx + 26, 78);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === 'vase') {
    // 梅瓶：丰肩敛腹
    const celadon = ctx.createLinearGradient(-110, -200, 110, 200);
    celadon.addColorStop(0, '#ccdfd2'); celadon.addColorStop(0.5, '#aecbb9'); celadon.addColorStop(1, '#87a892');
    ctx.fillStyle = celadon;
    ctx.beginPath();
    ctx.moveTo(-32, -205); ctx.lineTo(32, -205);       // 小口
    ctx.quadraticCurveTo(36, -180, 90, -150);          // 颈肩
    ctx.quadraticCurveTo(130, -95, 96, 60);            // 丰肩下行
    ctx.quadraticCurveTo(70, 150, 52, 195);            // 敛腹
    ctx.lineTo(-52, 195);
    ctx.quadraticCurveTo(-70, 150, -96, 60);
    ctx.quadraticCurveTo(-130, -95, -90, -150);
    ctx.quadraticCurveTo(-36, -180, -32, -205);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(90,120,100,0.35)';           // 釉色晕染
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(-30 + i * 16, -60 + i * 45, 34 - i * 3, 60 - i * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#87a892'; ctx.fillRect(-56, 195, 112, 18); // 圈足
  } else if (kind === 'bi') {
    // 玉璧：谷纹环
    ctx.fillStyle = '#8fae8b';
    ctx.beginPath(); ctx.arc(0, 0, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6d9bc';
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6d8a68'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 190, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 26; i++) { // 谷纹凸点
      const a = (i / 26) * Math.PI * 2;
      for (const r of [90, 130]) {
        ctx.fillStyle = 'rgba(105,135,100,0.75)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,238,214,0.6)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    // 青瓷莲瓣碗
    const glaze = ctx.createLinearGradient(0, -140, 0, 120);
    glaze.addColorStop(0, '#e9f1ee'); glaze.addColorStop(1, '#b9d2c4');
    ctx.fillStyle = glaze;
    ctx.beginPath(); ctx.ellipse(0, -110, 185, 46, 0, 0, Math.PI * 2); ctx.fill(); // 口沿
    ctx.beginPath(); // 碗身
    ctx.moveTo(-185, -110);
    ctx.quadraticCurveTo(-150, 60, -60, 92);
    ctx.lineTo(60, 92);
    ctx.quadraticCurveTo(150, 60, 185, -110);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5b7fa6'; ctx.lineWidth = 4;
    for (let i = -4; i <= 4; i++) { // 莲瓣
      ctx.beginPath();
      ctx.moveTo(i * 38, -68);
      ctx.quadraticCurveTo(i * 38 + 16, 10, i * 38, 78);
      ctx.quadraticCurveTo(i * 38 - 16, 10, i * 38, -68);
      ctx.stroke();
    }
    ctx.fillStyle = '#c6d8cd'; ctx.fillRect(-58, 92, 116, 26); // 圈足
  }
  ctx.restore();

  ctx.fillStyle = '#4a3a22'; ctx.textAlign = 'center';
  ctx.font = `34px ${FONT}`;
  ctx.fillText(caption.zh, 320, 726);
  ctx.strokeStyle = '#a3823f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(220, 746); ctx.lineTo(420, 746); ctx.stroke();
  ctx.fillStyle = '#6b5a3c'; ctx.font = `italic 18px Georgia,serif`;
  ctx.fillText(clampText(ctx, caption.en, 560), 320, 776);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ================================================================== *
 * 壁画：中国水墨山水长卷
 * 画法：宣纸底 → 远/中/近多层山（浓淡墨 + 顺坡皴法 + 山脊骨线）
 *      → 云雾留白 → 水面（倒影 + 水纹）→ 点景（渔舟/松/柳/山亭/飞瀑/归雁）
 *      → 近景坡岸与苔石 → 绫裱边 → 竖排题款与朱红印章 → 英文题名
 * 随机数全部取自固定种子：同一幅画的每一笔都可复现，不会每次刷新就变样。
 * ================================================================== */

/** 壁画场景：两幅各不相同的设色水墨 */
export type MuralScene = 'misty-river' | 'autumn-peak';

/** 一座山峰：x 峰位、wl/wr 左右半宽、h 峰高、kl/kr 左右陡峭度（1 尖峭 → 3 圆浑） */
interface InkPeak { x: number; wl: number; wr: number; h: number; kl: number; kr: number }

/** 已成形的山层 */
interface InkRange {
  baseY: number;
  ink: string;
  alpha: number;
  blur: number;
  peaks: InkPeak[];
  texture: number;
  mistAfter: number;
}

/** 山层参数：峰形在作画时按种子生成 */
interface RangeSpec {
  baseY: number;
  ink: string;
  alpha: number;
  blur: number;
  /** 主峰数量 */
  count: number;
  /** 峰高范围（像素） */
  h: [number, number];
  /** 峰半宽范围 */
  w: [number, number];
  /** 陡峭度范围 */
  k: [number, number];
  /** 皴法笔触数 */
  texture: number;
  /** 此层之后铺雾的浓度 */
  mistAfter: number;
}

interface InkSceneSpec {
  seed: number;
  sky: [string, string];
  ranges: RangeSpec[];
  /** 水面基线；纯山景传 null */
  waterY: number | null;
  /** 渔舟 [x, y, scale] */
  boat: [number, number, number] | null;
  /** 岸树：立在第 t 段近景坡岸曲线上 */
  trees: { kind: 'pine' | 'willow'; t: number; scale: number }[];
  /** 苔石：立在坡岸曲线的第 t 段 */
  rocks: number[];
  /** 山亭：立在第 range 层的 xRatio 处（y 由山脊算出） */
  pavilion: { range: number; xRatio: number; scale: number } | null;
  /** 飞瀑：从第 range 层 xRatio 附近的山面倾泻到 toY */
  waterfall: { range: number; xRatio: number; toY: number; width: number } | null;
  /** 归雁只数 */
  geese: number;
  shore: 'left' | 'right';
  /** 竖排题款位置 */
  inscription: [number, number];
  /** 英文题名的落点与对齐（避免与题款、近景墨色打架） */
  caption: { x: number; align: 'left' | 'right' };
  note: string;
}

const MURAL_W = 2048;
const MURAL_H = 768;
const SEAL_RED = '#a8322a';
/** 近景坡岸的固定几何 */
const SHORE_RISE = 176;
const SHORE_RUN = 400;

const INK_SCENES: Record<MuralScene, InkSceneSpec> = {
  // 《溪山烟雨》——平远江景：远山淡墨层叠，主山藏于烟雨，江心一叶渔舟，岸柳垂烟
  'misty-river': {
    seed: 20260923,
    sky: ['#e7e9e1', '#f9f6ec'],
    ranges: [
      { baseY: 286, ink: '96,104,102', alpha: 0.14, blur: 8, count: 6, h: [38, 92], w: [180, 340], k: [2.3, 3.0], texture: 0, mistAfter: 0.5 },
      { baseY: 332, ink: '80,90,88', alpha: 0.2, blur: 5, count: 5, h: [90, 152], w: [130, 250], k: [1.85, 2.6], texture: 0, mistAfter: 0.44 },
      { baseY: 404, ink: '58,68,66', alpha: 0.36, blur: 1.6, count: 4, h: [150, 214], w: [110, 200], k: [1.45, 2.0], texture: 360, mistAfter: 0.32 },
      { baseY: 452, ink: '48,56,54', alpha: 0.46, blur: 0, count: 2, h: [72, 112], w: [150, 220], k: [1.7, 2.3], texture: 220, mistAfter: 0 }
    ],
    waterY: 452,
    boat: [986, 544, 1.3],
    trees: [{ kind: 'willow', t: 0.16, scale: 1.5 }, { kind: 'willow', t: 0.62, scale: 0.9 }],
    rocks: [0.44, 0.86],
    pavilion: { range: 3, xRatio: 0.75, scale: 0.95 },
    waterfall: null,
    geese: 6,
    shore: 'left',
    inscription: [1878, 96],
    caption: { x: MURAL_W - 78, align: 'right' },
    note: '丙午年春月 写烟江意'
  },
  // 《秋山晚翠》——高远山景：五峰叠翠，一瀑飞泻，松林山亭，归雁成行
  'autumn-peak': {
    seed: 19870504,
    sky: ['#f0e9da', '#faf5e7'],
    ranges: [
      { baseY: 318, ink: '98,98,90', alpha: 0.12, blur: 9, count: 5, h: [52, 108], w: [170, 330], k: [2.2, 3.0], texture: 0, mistAfter: 0.46 },
      { baseY: 356, ink: '80,82,76', alpha: 0.2, blur: 5, count: 4, h: [140, 206], w: [140, 250], k: [1.5, 2.2], texture: 0, mistAfter: 0.4 },
      { baseY: 422, ink: '56,60,56', alpha: 0.4, blur: 1.4, count: 5, h: [200, 300], w: [120, 210], k: [1.1, 1.6], texture: 470, mistAfter: 0.3 },
      { baseY: 486, ink: '46,50,48', alpha: 0.48, blur: 0, count: 2, h: [76, 116], w: [160, 240], k: [1.4, 2.0], texture: 260, mistAfter: 0 }
    ],
    waterY: 486,
    boat: null,
    trees: [{ kind: 'pine', t: 0.22, scale: 1.45 }, { kind: 'pine', t: 0.62, scale: 0.9 }],
    rocks: [0.46, 0.88],
    pavilion: { range: 2, xRatio: 0.27, scale: 0.9 },
    waterfall: { range: 2, xRatio: 0.58, toY: 470, width: 34 },
    geese: 8,
    shore: 'right',
    inscription: [150, 96],
    caption: { x: 232, align: 'left' },
    note: '丙午年秋月 摹宋人笔意'
  }
};

/** 可复现的伪随机数（mulberry32） */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 按种子生成一层山：主峰左右坡各自随机（不会长成等边三角形），两肩再带小峰 */
function makePeaks(rng: () => number, spec: RangeSpec, w: number): InkPeak[] {
  const peaks: InkPeak[] = [];
  const step = w / spec.count;
  const spread = (): number => lerp(spec.w[0], spec.w[1], rng());
  const steep = (): number => lerp(spec.k[0], spec.k[1], rng());
  for (let i = 0; i < spec.count; i++) {
    const cx = (i + 0.5) * step + (rng() - 0.5) * step * 0.62;
    const h = lerp(spec.h[0], spec.h[1], rng());
    const main: InkPeak = { x: cx, h, wl: spread(), wr: spread(), kl: steep(), kr: steep() };
    peaks.push(main);
    for (const side of [-1, 1] as const) {
      if (rng() < 0.6) continue;
      const foot = side < 0 ? main.wl : main.wr;
      peaks.push({
        x: cx + side * foot * lerp(0.5, 0.9, rng()),
        h: h * lerp(0.34, 0.6, rng()),
        wl: foot * lerp(0.4, 0.62, rng()),
        wr: foot * lerp(0.4, 0.62, rng()),
        kl: steep(),
        kr: steep()
      });
    }
  }
  return peaks;
}

/** 某点处山体高出基线的像素高度：多峰取最大，陡峭度越大峰顶越圆浑 */
function ridgeHeight(x: number, peaks: InkPeak[]): number {
  let h = 0;
  for (const p of peaks) {
    const left = x < p.x;
    const d = left ? (p.x - x) / p.wl : (x - p.x) / p.wr;
    if (d >= 1) continue;
    h = Math.max(h, p.h * Math.pow(1 - d, left ? p.kl : p.kr));
  }
  return h;
}

/** 近景坡岸上表面的曲线点（t ∈ 0..1），点景立木/苔石都落在它上面 */
function shorePoint(w: number, h: number, side: 'left' | 'right', t: number): [number, number] {
  const dir = side === 'left' ? 1 : -1;
  const x0 = side === 'left' ? 0 : w;
  const p0: [number, number] = [x0, h - SHORE_RISE];
  const p1: [number, number] = [x0 + dir * SHORE_RUN * 0.39, h - SHORE_RISE + 4];
  const p2: [number, number] = [x0 + dir * SHORE_RUN * 0.6, h - 60];
  const p3: [number, number] = [x0 + dir * SHORE_RUN, h];
  const mt = 1 - t;
  const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** 宣纸底：底色渐变 + 纸纤维 + 岁月黄斑 */
function inkPaper(ctx: CanvasRenderingContext2D, w: number, h: number, sky: [string, string], rng: () => number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.58, sky[1]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = `rgba(150,134,98,${0.02 + rng() * 0.05})`;
    ctx.fillRect(rng() * w, rng() * h, 3 + rng() * 10, 1);
  }
  for (let i = 0; i < 14; i++) {
    const x = rng() * w, y = rng() * h, r = 70 + rng() * 160;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, 'rgba(176,148,96,0.05)');
    spot.addColorStop(1, 'rgba(176,148,96,0)');
    ctx.fillStyle = spot;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

/** 云雾：一串柔和的白色云气团（不是一条笔直的亮带） */
function inkMist(ctx: CanvasRenderingContext2D, w: number, y: number, thick: number, alpha: number, rng: () => number) {
  const blobs = 16;
  for (let i = 0; i < blobs; i++) {
    const cx = (i + 0.5) * (w / blobs) + (rng() - 0.5) * (w / blobs) * 1.1;
    const cy = y + (rng() - 0.5) * thick * 1.2;
    const rx = (w / blobs) * (1.15 + rng() * 0.95);
    const ry = thick * (0.5 + rng() * 0.75);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1);
    g.addColorStop(0, `rgba(253,250,240,${alpha})`);
    g.addColorStop(0.55, `rgba(253,250,240,${alpha * 0.62})`);
    g.addColorStop(1, 'rgba(253,250,240,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 一层山：淡墨晕染的山体 + 山脊骨线 + 顺坡皴法 + 点苔 */
function inkRange(ctx: CanvasRenderingContext2D, w: number, r: InkRange, rng: () => number) {
  const top = r.baseY - Math.max(...r.peaks.map(p => p.h));
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(0, r.baseY + 6);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, r.baseY - ridgeHeight(x, r.peaks));
    ctx.lineTo(w, r.baseY + 6);
    ctx.closePath();
  };

  // 墨韵：山顶为骨，山脚化入云雾
  ctx.save();
  if (r.blur > 0) ctx.filter = `blur(${r.blur}px)`;
  trace();
  const g = ctx.createLinearGradient(0, top, 0, r.baseY);
  g.addColorStop(0, `rgba(${r.ink},${Math.min(0.95, r.alpha * 1.9)})`);
  g.addColorStop(0.55, `rgba(${r.ink},${r.alpha * 0.9})`);
  g.addColorStop(1, `rgba(${r.ink},${r.alpha * 0.05})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // 山脊骨线：虚实相间的断笔，只勾勒峰头，不画成一根铁丝
  ctx.save();
  ctx.lineCap = 'round';
  const ridgeAlpha = Math.min(0.72, r.alpha * 1.5);
  let rx = 0;
  while (rx < w) {
    const xEnd = Math.min(w, rx + 34 + rng() * 120);
    ctx.strokeStyle = `rgba(${r.ink},${ridgeAlpha * (0.26 + rng() * 0.86)})`;
    ctx.lineWidth = Math.max(1.1, (2.6 - r.blur * 0.24) * (0.7 + rng() * 0.7));
    ctx.beginPath();
    for (let x = rx; x <= xEnd; x += 4) {
      const y = r.baseY - ridgeHeight(x, r.peaks);
      if (x === rx) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    rx = xEnd + rng() * 52;
  }
  ctx.restore();

  // 皴法：顺着坡面走向的短笔，成组落在山体内部；近山再点苔
  if (r.texture > 0) {
    ctx.save();
    trace();
    ctx.clip();
    ctx.lineCap = 'round';
    let drawn = 0;
    while (drawn < r.texture) {
      const clusterX = rng() * w;
      const cluster = 3 + Math.floor(rng() * 4);
      for (let i = 0; i < cluster && drawn < r.texture; i++, drawn++) {
        const x = clusterX + (rng() - 0.5) * 48;
        const yTop = r.baseY - ridgeHeight(x, r.peaks);
        const depth = r.baseY - yTop;
        if (depth < 46) continue;
        // 坡面切向（取指向山下的一侧），笔触顺着它走
        const dxs = 20;
        const ty = ridgeHeight(x - dxs, r.peaks) - ridgeHeight(x + dxs, r.peaks);
        const n = Math.hypot(2 * dxs, ty) || 1;
        let ux = (2 * dxs) / n, uy = ty / n;
        if (uy < 0) { ux = -ux; uy = -uy; }
        const sx = x, sy = yTop + 8 + rng() * Math.min(34, depth * 0.3);
        const len = 20 + rng() * 44;
        ctx.strokeStyle = `rgba(${r.ink},${0.09 + rng() * 0.2})`;
        ctx.lineWidth = 0.8 + rng() * 1.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          sx + ux * len * 0.55 - uy * len * 0.12,
          sy + uy * len * 0.55 + ux * len * 0.12,
          sx + ux * len, sy + uy * len
        );
        ctx.stroke();
      }
    }
    if (r.alpha > 0.35) {
      for (let i = 0; i < 90; i++) {
        const x = rng() * w;
        const yTop = r.baseY - ridgeHeight(x, r.peaks);
        const depth = r.baseY - yTop;
        if (depth < 30) continue;
        ctx.fillStyle = `rgba(${r.ink},${0.2 + rng() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, yTop + 10 + rng() * depth * 0.5, 1.2 + rng() * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (r.mistAfter > 0) inkMist(ctx, w, r.baseY - 6, 52, r.mistAfter, rng);
}

/** 水面：水色 + 近山压扁倒影 + 近长疏远的水纹 */
function inkWater(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  y: number, near: InkRange, rng: () => number
) {
  const ink = near.ink;
  const wash = ctx.createLinearGradient(0, y, 0, h);
  wash.addColorStop(0, `rgba(${ink},0.1)`);
  wash.addColorStop(0.7, `rgba(${ink},0.05)`);
  wash.addColorStop(1, `rgba(${ink},0.02)`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, y, w, h - y);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, w, h - y);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= w; x += 5) ctx.lineTo(x, y + ridgeHeight(x, near.peaks) * 0.5);
  ctx.lineTo(w, y);
  ctx.closePath();
  const ref = ctx.createLinearGradient(0, y, 0, y + 140);
  ref.addColorStop(0, `rgba(${ink},0.24)`);
  ref.addColorStop(1, `rgba(${ink},0)`);
  ctx.fillStyle = ref;
  ctx.filter = 'blur(4px)';
  ctx.fill();
  ctx.restore();

  ctx.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const dy = Math.pow(rng(), 0.62) * (h - y - 30);
    const yy = y + 10 + dy;
    const len = 34 + rng() * (70 + dy * 1.3);
    const x = rng() * (w - len);
    ctx.strokeStyle = `rgba(${ink},${0.05 + rng() * 0.13})`;
    ctx.lineWidth = 0.9 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.quadraticCurveTo(x + len / 2, yy - 2 - rng() * 5, x + len, yy);
    ctx.stroke();
  }
}

/** 渔舟：乌篷 + 蓑翁 + 斜插的篙 */
function inkBoat(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(38,44,42,0.9)';
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(0, 17, 40, 0);
  ctx.quadraticCurveTo(0, 7, -40, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-32, -1);
  ctx.quadraticCurveTo(-4, -19, 24, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-2, -21, 5.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13, -14);
  ctx.quadraticCurveTo(-2, -4, 9, -15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,44,42,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(33, -46); ctx.stroke();
  ctx.restore();
}

/** 松：曲干 + 层叠横枝，枝端垂下的扇形松针 */
function inkPine(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(34,40,38,0.92)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-13, -54, 3, -110);
  ctx.stroke();
  const layers: [number, number][] = [[-108, 48], [-86, 60], [-64, 52], [-42, 38]];
  for (const [ly, half] of layers) {
    ctx.strokeStyle = 'rgba(34,40,38,0.9)';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(3, ly);
    ctx.quadraticCurveTo(-half * 0.55, ly - 14, -half, ly - 3);
    ctx.moveTo(3, ly);
    ctx.quadraticCurveTo(half * 0.55, ly - 14, half, ly - 3);
    ctx.stroke();
    for (const dir of [-1, 1]) {
      for (const t of [0.58, 1]) {
        const cx = 3 + dir * half * t, cy = ly - 7 * t;
        ctx.strokeStyle = 'rgba(30,36,34,0.7)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI / 6 + (i / 12) * ((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

/** 柳：柔干 + 垂下的细条与点叶 */
function inkWillow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rng: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(46,50,44,0.9)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -52, -2, -100);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const [bx, by] of [[-30, -76], [34, -70], [4, -96]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(-2, -96);
    ctx.quadraticCurveTo(bx * 0.5, by - 10, bx, by);
    ctx.stroke();
  }
  for (let i = 0; i < 34; i++) {
    const sx = -40 + rng() * 82;
    const sy = -104 + rng() * 30;
    const len = 44 + rng() * 62;
    ctx.strokeStyle = `rgba(56,72,50,${0.3 + rng() * 0.34})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 11 + rng() * 13, sy + len * 0.6, sx + 4 + rng() * 15, sy + len);
    ctx.stroke();
  }
  ctx.restore();
}

/** 山亭：四角攒尖顶 + 立柱 */
function inkPavilion(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(36,42,40,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.quadraticCurveTo(-36, -36, -50, -26);
  ctx.quadraticCurveTo(-32, -32, 0, -34);
  ctx.quadraticCurveTo(32, -32, 50, -26);
  ctx.quadraticCurveTo(36, -36, 0, -62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(36,42,40,0.9)';
  ctx.lineWidth = 3;
  for (const cx of [-26, 0, 26]) {
    ctx.beginPath(); ctx.moveTo(cx, -32); ctx.lineTo(cx, 0); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, -50); ctx.lineTo(-9, -62); ctx.stroke();
  ctx.restore();
}

/** 飞瀑：两侧岩壁夹出的白色水帘 + 细流线 + 落水处的水花 */
function inkWaterfall(
  ctx: CanvasRenderingContext2D,
  x: number, topY: number, bottomY: number, width: number, rng: () => number
) {
  // 先压两侧岩壁：没有它，白水帘落在浅色山体上根本看不出来
  for (const side of [-1, 1] as const) {
    const inner = x + side * (width / 2 + 2);
    ctx.beginPath();
    ctx.moveTo(inner, topY - 4);
    ctx.lineTo(inner + side * 17, topY + (bottomY - topY) * 0.34);
    ctx.lineTo(inner + side * 11, bottomY);
    ctx.lineTo(inner, bottomY);
    ctx.closePath();
    const rock = ctx.createLinearGradient(inner, topY, inner + side * 18, bottomY);
    rock.addColorStop(0, 'rgba(38,44,42,0.55)');
    rock.addColorStop(1, 'rgba(30,36,34,0.3)');
    ctx.fillStyle = rock;
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      const sx = inner + side * rng() * 16;
      const sy = topY + rng() * (bottomY - topY);
      ctx.strokeStyle = `rgba(20,25,24,${0.12 + rng() * 0.3})`;
      ctx.lineWidth = 0.8 + rng() * 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + side * (2 + rng() * 8), sy + 5 + rng() * 14);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x - width / 2 - 3, topY, width + 6, bottomY - topY);
  ctx.clip();
  ctx.fillStyle = 'rgba(253,251,244,0.94)';
  ctx.fillRect(x - width / 2 - 3, topY, width + 6, bottomY - topY);
  for (let i = 0; i < 9; i++) {
    const lx = x - width / 2 + rng() * width;
    ctx.strokeStyle = `rgba(140,150,146,${0.1 + rng() * 0.16})`;
    ctx.lineWidth = 1 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(lx, topY);
    ctx.lineTo(lx + (rng() - 0.5) * 7, bottomY);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(253,251,244,0.75)';
  ctx.beginPath();
  ctx.ellipse(x, bottomY - 5, width * 1.7, 11, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 归雁：极简的“人”字笔触，排成一列小队 */
function gooseV(rng: () => number, count: number): [number, number, number][] {
  const bx = 250 + rng() * 140, by = 108 + rng() * 52;
  const out: [number, number, number][] = [[bx, by, 1]];
  for (let i = 1; i < count; i++) {
    const row = Math.ceil(i / 2);
    const side = i % 2 === 1 ? -1 : 1;
    out.push([bx + side * row * 62, by + row * 30 + (rng() - 0.5) * 9, Math.max(0.42, 1 - row * 0.11)]);
  }
  return out;
}

/** 落笔：把雁阵画上去 */
function inkGeese(ctx: CanvasRenderingContext2D, list: [number, number, number][]) {
  ctx.lineCap = 'round';
  for (const [x, y, s] of list) {
    ctx.strokeStyle = 'rgba(44,50,48,0.72)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 5 * s, x, y);
    ctx.quadraticCurveTo(x + 4 * s, y - 5 * s, x + 9 * s, y);
    ctx.stroke();
  }
}

/** 近景坡岸：一脚斜下的浓墨土坡，带石纹与苔点 */
function inkShore(ctx: CanvasRenderingContext2D, w: number, h: number, side: 'left' | 'right', rng: () => number) {
  const dir = side === 'left' ? 1 : -1;
  const x0 = side === 'left' ? 0 : w;
  const path = () => {
    const p1: [number, number] = [x0 + dir * SHORE_RUN * 0.39, h - SHORE_RISE + 4];
    const p2: [number, number] = [x0 + dir * SHORE_RUN * 0.6, h - 60];
    const p3: [number, number] = [x0 + dir * SHORE_RUN, h];
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0, h - SHORE_RISE);
    ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(0, h - SHORE_RISE, 0, h);
  g.addColorStop(0, 'rgba(52,58,56,0.42)');
  g.addColorStop(0.55, 'rgba(40,46,44,0.82)');
  g.addColorStop(1, 'rgba(26,31,30,0.96)');
  ctx.fillStyle = g;
  path();
  ctx.fill();

  ctx.save();
  path();
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const x = x0 + dir * rng() * SHORE_RUN;
    const y = h - SHORE_RISE + rng() * SHORE_RISE;
    ctx.strokeStyle = `rgba(14,18,17,${0.1 + rng() * 0.3})`;
    ctx.lineWidth = 0.8 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * (6 + rng() * 26), y + 4 + rng() * 16);
    ctx.stroke();
  }
  for (let i = 0; i < 240; i++) {
    const x = x0 + dir * rng() * SHORE_RUN;
    const y = h - SHORE_RISE + rng() * SHORE_RISE;
    ctx.fillStyle = `rgba(12,16,15,${0.2 + rng() * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 苔石 */
function inkRock(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(28,34,32,0.94)';
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.quadraticCurveTo(-36, -26, -6, -33);
  ctx.quadraticCurveTo(20, -38, 27, -13);
  ctx.quadraticCurveTo(34, 2, 16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,216,204,0.28)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-18, -19);
  ctx.quadraticCurveTo(0, -29, 16, -17);
  ctx.stroke();
  ctx.restore();
}

/** 竖排题字，返回下一行的起笔 y */
function inkVertical(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): number {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px ${FONT}`;
  for (let i = 0; i < text.length; i++) ctx.fillText(text[i], x, y + i * size * 1.14);
  return y + text.length * size * 1.14;
}

/** 题款：留白晕 → 竖排大字标题 → 小字落款 → 朱红印章 */
function inkInscription(ctx: CanvasRenderingContext2D, x: number, y: number, title: string, note: string) {
  const halo = ctx.createRadialGradient(x, y + 110, 20, x, y + 110, 240);
  halo.addColorStop(0, 'rgba(250,247,238,0.9)');
  halo.addColorStop(1, 'rgba(250,247,238,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 240, y - 140, 480, 520);

  const afterTitle = inkVertical(ctx, title, x, y + 44, 54, 'rgba(34,40,38,0.93)');
  const afterNote = inkVertical(ctx, note, x - 32, afterTitle + 18, 20, 'rgba(56,62,58,0.82)');
  const s = 34;
  ctx.fillStyle = SEAL_RED;
  ctx.fillRect(x - s / 2, afterNote + 18, s, s);
  ctx.fillStyle = 'rgba(252,248,242,0.95)';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('赏', x, afterNote + 18 + s / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

/** 绫裱边：外层米色绫 + 内层深色细线 */
function inkMount(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#cdbc96';
  ctx.lineWidth = 34;
  ctx.strokeRect(17, 17, w - 34, h - 34);
  ctx.strokeStyle = 'rgba(112,96,64,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.strokeStyle = 'rgba(255,252,244,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(29, 29, w - 58, h - 58);
}

/** 在 xRatio 附近挑一座最高的峰，取其右侧山面作为飞瀑的落笔处 */
function waterfallX(peaks: InkPeak[], cx: number, span: number): number {
  let best: InkPeak | null = null;
  for (const p of peaks) {
    if (Math.abs(p.x - cx) > span) continue;
    if (!best || p.h > best.h) best = p;
  }
  const p = best ?? peaks[0];
  return p.x + p.wr * 0.42;
}

/** 中国水墨山水壁画 */
export function makeMuralTexture(scene: MuralScene, title: { zh: string; en: string }): THREE.CanvasTexture {
  const [c, ctx] = canvas(MURAL_W, MURAL_H);
  const spec = INK_SCENES[scene];
  const rng = seeded(spec.seed);
  const ranges: InkRange[] = spec.ranges.map(rs => ({ ...rs, peaks: makePeaks(rng, rs, MURAL_W) }));

  inkPaper(ctx, MURAL_W, MURAL_H, spec.sky, rng);
  for (const r of ranges) inkRange(ctx, MURAL_W, r, rng);

  const near = ranges[ranges.length - 1];
  if (spec.waterY !== null) {
    // 山脚化入水面，避免所有山峰压出一条笔直的基线
    inkMist(ctx, MURAL_W, spec.waterY - 8, 30, 0.52, rng);
    inkWater(ctx, MURAL_W, MURAL_H, spec.waterY, near, rng);
  }
  inkGeese(ctx, gooseV(rng, spec.geese));

  if (spec.waterfall) {
    const r = ranges[spec.waterfall.range];
    const fx = waterfallX(r.peaks, spec.waterfall.xRatio * MURAL_W, 260);
    inkWaterfall(ctx, fx, r.baseY - ridgeHeight(fx, r.peaks) + 4, spec.waterfall.toY, spec.waterfall.width, rng);
  }

  inkShore(ctx, MURAL_W, MURAL_H, spec.shore, rng);
  for (const t of spec.rocks) {
    const [rx, ry] = shorePoint(MURAL_W, MURAL_H, spec.shore, t);
    inkRock(ctx, rx, ry, 0.9 + t * 0.4);
  }
  for (const t of spec.trees) {
    const [tx, ty] = shorePoint(MURAL_W, MURAL_H, spec.shore, t.t);
    if (t.kind === 'pine') inkPine(ctx, tx, ty, t.scale);
    else inkWillow(ctx, tx, ty, t.scale, rng);
  }
  if (spec.pavilion) {
    const r = ranges[spec.pavilion.range];
    const px = spec.pavilion.xRatio * MURAL_W;
    inkPavilion(ctx, px, r.baseY - ridgeHeight(px, r.peaks) + 2, spec.pavilion.scale);
  }
  if (spec.boat) inkBoat(ctx, spec.boat[0], spec.boat[1], spec.boat[2]);

  inkMount(ctx, MURAL_W, MURAL_H);
  inkInscription(ctx, spec.inscription[0], spec.inscription[1], title.zh, spec.note);

  // 英文题名：先描一道浅色衬底（压在任何墨色上都读得清），再落字
  ctx.font = 'italic 26px Georgia,serif';
  ctx.textAlign = spec.caption.align;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(250,247,238,0.85)';
  ctx.strokeText(title.en, spec.caption.x, MURAL_H - 66);
  ctx.fillStyle = 'rgba(96,88,68,0.82)';
  ctx.fillText(title.en, spec.caption.x, MURAL_H - 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeHotspotTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(217,180,90,0.9)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#3a2c0e'; ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('+', 32, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 展柜文物铭牌：中文为主、英文小字附于下方 —— 与国内博物馆铭牌一致，
 * 不随界面语言切换（墙面文字保持中文）。
 */
export function makePlateTexture(
  name: { zh: string; en: string },
  dynasty: { zh: string; en: string }
): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 256);
  const bg = ctx.createLinearGradient(0, 0, 512, 256);
  bg.addColorStop(0, '#b08d3f'); bg.addColorStop(0.5, '#e6c875'); bg.addColorStop(1, '#a3813a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#5a4416'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, 484, 228);
  ctx.fillStyle = '#3a2c0e'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${name.zh.length > 14 ? 42 : 50}px ${FONT}`;
  ctx.fillText(clampText(ctx, name.zh, 440), 256, 84);
  ctx.font = `24px ${FONT}`;
  ctx.fillText(clampText(ctx, dynasty.zh, 440), 256, 122);
  ctx.strokeStyle = 'rgba(90,68,22,0.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(128, 144); ctx.lineTo(384, 144); ctx.stroke();
  ctx.fillStyle = '#4d3c14'; ctx.font = `bold 22px Georgia,serif`;
  ctx.fillText(clampText(ctx, name.en, 450), 256, 178);
  ctx.font = `italic 19px Georgia,serif`;
  ctx.fillText(clampText(ctx, dynasty.en, 450), 256, 208);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 展品既无 glb 也无程序化占位时挂的错误角标（规格 §8） */
export function makeErrorBadgeTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(198,52,44,0.92)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', 32, 35);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
