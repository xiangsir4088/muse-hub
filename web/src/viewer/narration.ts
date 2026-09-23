export function fallbackDurationMs(text: string): number {
  const perChar = /[\u4e00-\u9fff]/.test(text) ? 250 : 70;
  return Math.max(3000, text.length * perChar);
}

export function createNarration(
  playAudio: (url: string) => Promise<boolean>, onDone: () => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  const armFallback = (subtitle: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (!cancelled) onDone(); }, fallbackDurationMs(subtitle));
  };
  return {
    start(file: string | undefined, subtitle: string, _lang: 'zh' | 'en') {
      cancelled = false;
      if (!file) { armFallback(subtitle); return; }
      void playAudio(`/content/audio/${file}`).then(ok => {
        if (!cancelled && !ok) armFallback(subtitle);
      });
    },
    stop() { cancelled = true; if (timer) clearTimeout(timer); timer = null; }
  };
}
