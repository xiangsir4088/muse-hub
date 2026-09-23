import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANGS, PANEL_SPECS, UI } from '../src/i18n';

const CJK = /[\u3400-\u9fff]/;

describe('界面词典 UI', () => {
  it('中英两份词典键完全一致', () => {
    expect(Object.keys(UI.en).sort()).toEqual(Object.keys(UI.zh).sort());
  });

  it('英文文案里不含中文（langButton 例外：英文界面下显示「中文」是正确的）', () => {
    for (const [key, value] of Object.entries(UI.en)) {
      if (key === 'langButton' || typeof value !== 'string') continue;
      expect(CJK.test(value), `UI.en.${key} 仍是中文：「${value}」`).toBe(false);
    }
  });

  it('所有文案都非空', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(UI[lang])) {
        if (typeof value === 'string') expect(value.trim().length, `UI.${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('站序文案随语言变化', () => {
    expect(UI.zh.tourStation(2, 5)).toBe('第 2/5 站');
    expect(UI.en.tourStation(2, 5)).toBe('Stop 2/5');
  });

  it('中英切换按钮互指对方语言', () => {
    expect(UI.zh.langButton).toBe('English');
    expect(UI.en.langButton).toBe('中文');
  });
});

describe('墙面展板文案（中英同屏，不随界面语言切换）', () => {
  it('四块展板齐全', () => {
    expect(Object.keys(PANEL_SPECS).sort()).toEqual(['bronze', 'history', 'intro', 'song']);
  });

  it('中文为主体、英文为附录，两种语言都真实存在', () => {
    for (const [kind, spec] of Object.entries(PANEL_SPECS)) {
      expect(CJK.test(spec.title), `${kind}.title 应为中文`).toBe(true);
      expect(CJK.test(spec.subtitle), `${kind}.subtitle 应为中文`).toBe(true);
      expect(spec.body.length, `${kind}.body 行数`).toBeGreaterThanOrEqual(4);
      expect(spec.body.every(l => CJK.test(l)) || spec.body.some(l => CJK.test(l))).toBe(true);
      // 英文部分不能是中文，否则等于没翻译
      expect(CJK.test(spec.subtitleEn), `${kind}.subtitleEn 应为英文`).toBe(false);
      expect(CJK.test(spec.bodyEn), `${kind}.bodyEn 应为英文`).toBe(false);
      expect(spec.subtitleEn.length).toBeGreaterThan(10);
      expect(spec.bodyEn.length).toBeGreaterThan(80);
      expect(spec.footer.length).toBeGreaterThan(2);
      expect(spec.footerEn.length).toBeGreaterThan(5);
    }
  });
});

describe('菜单不许硬编码中文（源码级回归）', () => {
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('ViewerPage 的界面文案全部来自词典', () => {
    const src = readFileSync(fileURLToPath(new URL('../src/pages/ViewerPage.tsx', import.meta.url)), 'utf8');
    const code = stripComments(src);
    const leftovers = code.match(new RegExp(CJK.source, 'g')) ?? [];
    expect(leftovers, `ViewerPage 中残留 ${leftovers.length} 个硬编码中文字符（应改为 UI[lang] 取值）`).toHaveLength(0);
  });

  it('App 的加载 / 错误提示全部来自词典', () => {
    const src = readFileSync(fileURLToPath(new URL('../src/App.tsx', import.meta.url)), 'utf8');
    const code = stripComments(src);
    const leftovers = code.match(new RegExp(CJK.source, 'g')) ?? [];
    expect(leftovers, `App 中残留 ${leftovers.length} 个硬编码中文字符`).toHaveLength(0);
  });
});
