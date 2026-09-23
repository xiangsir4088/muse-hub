import { useEffect, useState } from 'react';
import { ExhibitSchema, type Exhibit, type HallLayout, type TourRoute } from '@museum/shared';
import ViewerPage from './pages/ViewerPage';
import { UI, type Lang } from './i18n';

interface ContentData {
  layout: HallLayout;
  exhibitMap: Map<string, Exhibit>;
  routes: TourRoute[];
  /** undefined = 探测失败，前端退回"先试再降级" */
  availableModels?: Set<string>;
}

const LANG_KEY = 'museum.lang';

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch { /* 隐私模式下 localStorage 不可用 */ }
  return 'zh';
}

export default function App() {
  const [data, setData] = useState<ContentData | null>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>(readLang);
  const t = UI[lang];

  // 语言：同步 <html lang> 与文档标题，并记住选择
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t.title;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* 忽略 */ }
  }, [lang, t.title]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/content/scenes/hall-01.json');
        if (!res.ok) throw new Error(String(res.status));
        const layout = (await res.json()) as HallLayout;
        const exhibitMap = new Map<string, Exhibit>();
        const routes: TourRoute[] = [];
        let availableModels: Set<string> | undefined;
        await Promise.all([
          ...[...new Set(layout.exhibits.map(p => p.exhibitRef))].map(async ref => {
            const r = await fetch(`/content/exhibits/${ref}.json`);
            if (!r.ok) return;
            const raw = (await r.json()) as Exhibit;
            // 过一遍 schema：让 .default([]) 之类的缺省真正生效（raw JSON 没有默认值，
            // 历史 bug：hotspots 缺失时 addExhibit 读 .length 直接抛错）
            const parsed = ExhibitSchema.safeParse(raw);
            if (parsed.success) exhibitMap.set(ref, parsed.data);
            else {
              console.warn(`[museum] exhibit "${ref}" failed schema validation, using raw:`, parsed.error.issues[0]);
              exhibitMap.set(ref, raw);
            }
          }),
          (async () => {
            const r = await fetch('/content/routes/index.json');
            if (!r.ok) return;
            const { ids } = (await r.json()) as { ids: string[] };
            const loaded = await Promise.all(ids.map(async id => {
              const r2 = await fetch(`/content/routes/${id}.json`);
              return r2.ok ? (await r2.json()) as TourRoute : null;
            }));
            routes.push(...loaded.filter((x): x is TourRoute => x !== null));
          })(),
          (async () => {
            // 已知的可用模型清单：拿到后就不再对不存在的 glb 打无谓的 404 请求
            const r = await fetch('/api/models').catch(() => null);
            if (!r?.ok) return;
            availableModels = new Set(((await r.json()) as { models: string[] }).models);
          })()
        ]);
        setData({ layout, exhibitMap, routes, availableModels });
      } catch { setError(UI[readLang()].loadError); }
    })();
  }, []);

  if (error) return <div style={{ color: '#fff', background: '#0b0c0f', padding: 40, minHeight: '100vh' }}>{error}</div>;
  if (!data) return <div style={{ color: '#ccc', background: '#0b0c0f', padding: 40, minHeight: '100vh' }}>{t.loading}</div>;
  return (
    <ViewerPage
      layout={data.layout} placements={data.layout.exhibits}
      exhibitMap={data.exhibitMap} routes={data.routes}
      availableModels={data.availableModels}
      lang={lang} onLangChange={setLang}
    />
  );
}
