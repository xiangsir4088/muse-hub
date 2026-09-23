import { useEffect, useRef, useState } from 'react';
import type { Exhibit, HallLayout, Hotspot, Placement, TourRoute } from '@museum/shared';
import { MuseumViewer } from '../viewer/MuseumViewer';
import { detectTier, type Tier } from '../viewer/quality';
import { joystickVector } from '../viewer/movement';
import type { ViewpointName } from '../viewer/inspectCamera';
import { createNarration } from '../viewer/narration';
import { UI, type Lang } from '../i18n';

type SubMode = 'zh' | 'en' | 'both';

interface Props {
  layout: HallLayout;
  placements: Placement[];
  exhibitMap: Map<string, Exhibit>;
  routes: TourRoute[];
  availableModels?: Set<string>;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export default function ViewerPage({
  layout, placements, exhibitMap, routes, availableModels, lang, onLangChange
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<MuseumViewer | null>(null);
  const [fps, setFps] = useState(0);
  const [tier, setTier] = useState<Tier>(() => {
    const isMobile = matchMedia('(pointer: coarse)').matches;
    return detectTier({ isMobile, hardwareConcurrency: navigator.hardwareConcurrency });
  });
  const [selected, setSelected] = useState<{ placement: Placement; exhibit: Exhibit } | null>(null);
  const [mode, setMode] = useState<'roam' | 'inspect'>('roam');
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const [fill, setFill] = useState({ azimDeg: 40, intensity: 2.2 });
  const [routeId, setRouteId] = useState('');
  const [tourRoute, setTourRoute] = useState<TourRoute | null>(null);
  const [tourNode, setTourNode] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [tourAutoPaused, setTourAutoPaused] = useState(false);
  const [subtitleMode, setSubtitleMode] = useState<SubMode>('both');
  const [subtitle, setSubtitle] = useState<{ zh: string; en: string } | null>(null);
  const tourRouteRef = useRef<TourRoute | null>(null);
  const langRef = useRef<Lang>(lang); langRef.current = lang;
  const narrationRef = useRef<ReturnType<typeof createNarration> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const t = UI[lang];

  const playAudio = (url: string) => new Promise<boolean>(resolve => {
    const a = new Audio(url);
    audioRef.current = a;
    a.oncanplaythrough = () => void a.play().then(() => resolve(true)).catch(() => resolve(false));
    a.onerror = () => resolve(false);
    a.onended = () => viewerRef.current?.tourNarrationDone();
    a.load();
  });

  useEffect(() => {
    const viewer = new MuseumViewer({
      canvas: canvasRef.current!, layout, placements,
      exhibits: exhibitMap,
      availableModels,
      onExhibitClick: id => {
        const p = id ? placements.find(x => x.id === id) : undefined;
        setSelected(p ? { placement: p, exhibit: exhibitMap.get(p.exhibitRef)! } : null);
      },
      onFps: setFps,
      onModeChange: setMode,
      onHotspotClick: setHotspot,
      onTourNode: i => {
        setTourNode(i); setTourAutoPaused(false);
        const r = tourRouteRef.current;
        if (!r) return;
        const node = r.nodes[i];
        const l = langRef.current;
        narrationRef.current?.start(l === 'zh' ? node.audio.zh : node.audio.en, node.subtitle[l], l);
        setSubtitle(node.subtitle);
      },
      onTourAutoPause: () => { setTourPaused(true); setTourAutoPaused(true); },
      onTourEnd: () => {
        setTourRoute(null); setTourPaused(false); setTourAutoPaused(false);
        tourRouteRef.current = null; setSubtitle(null);
      }
    });
    narrationRef.current = createNarration(playAudio, () => viewerRef.current?.tourNarrationDone());
    viewerRef.current = viewer;
    return () => { narrationRef.current?.stop(); viewer.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { viewerRef.current?.setTier(tier); }, [tier]);
  useEffect(() => { viewerRef.current?.setSelected(selected?.placement.id ?? null); }, [selected]);
  useEffect(() => { viewerRef.current?.setFillLight((fill.azimDeg * Math.PI) / 180, fill.intensity); }, [fill]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') viewerRef.current?.exitInspect(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onStick = (kind: 'start' | 'move' | 'end') => (e: React.TouchEvent) => {
    const el = stickRef.current!, knob = knobRef.current!;
    if (kind === 'end') {
      knob.style.transform = '';
      viewerRef.current?.setExternalMove({ forward: 0, strafe: 0 });
      return;
    }
    const tv = e.touches[0];
    const r = el.getBoundingClientRect();
    const v = joystickVector({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, { x: tv.clientX, y: tv.clientY }, r.width / 2);
    knob.style.transform = `translate(${v.x * r.width * 0.4}px, ${v.y * r.width * 0.4}px)`;
    viewerRef.current?.setExternalMove({ forward: -v.y, strafe: v.x });
  };

  const isCoarse = matchMedia('(pointer: coarse)').matches;

  const stopNarration = () => { narrationRef.current?.stop(); audioRef.current?.pause(); setSubtitle(null); };
  const tourUiReset = () => { setTourRoute(null); setTourPaused(false); setTourAutoPaused(false); };
  const beginTour = () => {
    const r = routes.find(x => x.id === routeId);
    if (!r) return;
    setTourRoute(r); setTourNode(0); setTourPaused(false); setTourAutoPaused(false);
    tourRouteRef.current = r;
    viewerRef.current?.startTour(r);
  };
  const togglePause = () => {
    const v = viewerRef.current; if (!v) return;
    if (v.tourPaused) { v.resumeTour(); setTourPaused(false); setTourAutoPaused(false); }
    else { v.pauseTour(); setTourPaused(true); }
  };
  const jump = (i: number) => {
    const v = viewerRef.current; if (!v || !tourRoute) return;
    const n = Math.min(Math.max(i, 0), tourRoute.nodes.length - 1);
    stopNarration();
    v.tourJump(n); setTourNode(n); setTourPaused(false); setTourAutoPaused(false);
  };
  const endTour = () => { stopNarration(); viewerRef.current?.stopTour(); tourRouteRef.current = null; tourUiReset(); };

  const viewpoints: [ViewpointName, string][] = [
    ['full', t.viewFull], ['top', t.viewTop], ['rim', t.viewRim], ['bottom', t.viewBottom]
  ];

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,.5)', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
        <b>{layout.name[lang]}</b>
        <select value={tier} onChange={e => setTier(e.target.value as Tier)} aria-label={t.qualityHigh}>
          <option value="high">{t.qualityHigh}</option>
          <option value="medium">{t.qualityMedium}</option>
          <option value="low">{t.qualityLow}</option>
        </select>
        <span>{fps} FPS</span>
        <button
          onClick={() => onLangChange(lang === 'zh' ? 'en' : 'zh')}
          title={t.langTitle}
          data-testid="lang-toggle"
        >{t.langButton}</button>
      </div>
      {mode === 'roam' && !tourRoute && routes.length > 0 && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,.5)', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap', maxWidth: '96vw', overflowX: 'auto' }}>
          <select value={routeId} onChange={e => setRouteId(e.target.value)} aria-label={t.routePick}>
            <option value="">{t.routePick}</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.title[lang]}</option>)}
          </select>
          <select value={subtitleMode} onChange={e => setSubtitleMode(e.target.value as SubMode)} title={t.subtitleLabel}>
            <option value="both">{t.subBoth}</option>
            <option value="zh">{t.subZh}</option>
            <option value="en">{t.subEn}</option>
          </select>
          <button onClick={beginTour} disabled={!routeId}>{t.routeStart}</button>
        </div>
      )}
      {tourRoute && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,.6)', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 13, whiteSpace: 'nowrap', maxWidth: '96vw', overflowX: 'auto' }}>
          <b style={{ color: '#d9b45a' }}>{tourRoute.title[lang]}</b>
          <span>{t.tourStation(tourNode + 1, tourRoute.nodes.length)}</span>
          <button onClick={togglePause}>{tourPaused ? t.tourResume : t.tourPause}</button>
          <button onClick={() => jump(tourNode - 1)} disabled={tourNode === 0}>{t.tourPrev}</button>
          <button onClick={() => jump(tourNode + 1)} disabled={tourNode >= tourRoute.nodes.length - 1}>{t.tourNext}</button>
          <button onClick={endTour}>{t.tourExit}</button>
        </div>
      )}
      {tourAutoPaused && (
        <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'rgba(217,180,90,.92)', color: '#221c0c', padding: '6px 14px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
          {t.tourAutoPaused}
          <button onClick={() => { viewerRef.current?.resumeTour(); setTourPaused(false); setTourAutoPaused(false); }} style={{ fontSize: 13 }}>{t.tourFollow}</button>
        </div>
      )}
      {subtitle && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', maxWidth: '76%', background: 'rgba(0,0,0,.65)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
          {(subtitleMode === 'zh' || subtitleMode === 'both') && <div>{subtitle.zh}</div>}
          {(subtitleMode === 'en' || subtitleMode === 'both') && <div style={{ fontSize: 12, opacity: .8 }}>{subtitle.en}</div>}
        </div>
      )}
      {isCoarse && (
        <div ref={stickRef} onTouchStart={onStick('start')} onTouchMove={onStick('move')} onTouchEnd={onStick('end')}
          style={{ position: 'absolute', left: 24, bottom: 24, width: 112, height: 112, borderRadius: '50%', background: 'rgba(255,255,255,.12)', touchAction: 'none' }}>
          <div ref={knobRef} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.35)', margin: 32 }} />
        </div>
      )}
      {mode === 'inspect' && (
        <div style={{ position: 'absolute', right: 16, top: 60, width: 300, background: 'rgba(15,18,22,.92)', color: '#eee', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>
            {selected ? `${selected.exhibit.name[lang]} · ${t.inspect}` : t.inspectMode}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {viewpoints.map(([v, label]) => (
              <button key={v} onClick={() => viewerRef.current?.setInspectView(v)}>{label}</button>
            ))}
          </div>
          <label style={{ display: 'block', fontSize: 12, marginTop: 10 }}>
            {t.fillAzim} <input type="range" min={0} max={360} value={fill.azimDeg}
              onChange={e => setFill(f => ({ ...f, azimDeg: +e.target.value }))} style={{ width: '60%' }} />
          </label>
          <label style={{ display: 'block', fontSize: 12 }}>
            {t.fillIntensity} <input type="range" min={0} max={6} step={0.1} value={fill.intensity}
              onChange={e => setFill(f => ({ ...f, intensity: +e.target.value }))} style={{ width: '60%' }} />
          </label>
          <p style={{ fontSize: 11, opacity: .6, margin: '6px 0' }}>{t.inspectHint}</p>
          {hotspot && (
            <div style={{ background: 'rgba(217,180,90,.12)', border: '1px solid rgba(217,180,90,.5)', borderRadius: 8, padding: 10, margin: '8px 0' }}>
              <b style={{ fontSize: 13 }}>{hotspot.title[lang]} <span style={{ opacity: .7, fontWeight: 400 }}>{hotspot.title[lang === 'zh' ? 'en' : 'zh']}</span></b>
              <p style={{ fontSize: 12, margin: '6px 0' }}>{hotspot.body[lang]}</p>
              <p style={{ fontSize: 11, opacity: .7, margin: '0 0 6px' }}>{hotspot.body[lang === 'zh' ? 'en' : 'zh']}</p>
              <button onClick={() => setHotspot(null)} style={{ fontSize: 12 }}>{t.gotIt}</button>
            </div>
          )}
          <button onClick={() => viewerRef.current?.exitInspect()}>{t.exitInspect}</button>
        </div>
      )}
      {mode === 'roam' && selected && (
        <div style={{ position: 'absolute', right: 16, top: 60, width: 300, background: 'rgba(15,18,22,.92)', color: '#eee', padding: 16, borderRadius: 12 }}>
          <h3 style={{ margin: 0 }}>{selected.exhibit.name[lang]} <small style={{ opacity: .7 }}>{selected.exhibit.dynasty[lang]}</small></h3>
          <p style={{ fontSize: 14 }}>{selected.exhibit.summary[lang]}</p>
          <p style={{ fontSize: 12, opacity: .7 }}>{selected.exhibit.name[lang === 'zh' ? 'en' : 'zh']} · {selected.exhibit.material[lang]}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => viewerRef.current?.enterInspect(selected.placement.id)}>{t.enterInspect}</button>
            <button onClick={() => setSelected(null)}>{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}
