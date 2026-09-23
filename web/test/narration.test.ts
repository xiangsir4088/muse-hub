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
  it('stop cancels a pending fallback timer', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const n = createNarration(async () => false, onDone);
    n.start('a.mp3', '一段字幕', 'zh');
    n.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(onDone).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('uses english per-char rate for latin text', () => {
    expect(fallbackDurationMs('a'.repeat(100))).toBe(7000);
  });
});
