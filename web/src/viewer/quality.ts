export type Tier = 'high' | 'medium' | 'low';

export interface EnvInfo { isMobile: boolean; hardwareConcurrency: number; deviceMemory?: number }

/**
 * 自动档位：桌面端只要不是弱机就给中画质，弱机/移动端给低画质。
 * （原来的 `decent ? 'medium' : 'medium'` 分支两侧相同，属死代码，已删除；
 *  行为与 quality.test.ts 的既有断言保持一致。）
 */
export function detectTier(env: EnvInfo): Tier {
  const strong = env.hardwareConcurrency >= 8 && (env.deviceMemory ?? 8) >= 8;
  if (!env.isMobile) return strong ? 'high' : 'medium';
  return strong ? 'medium' : 'low';
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
