import type { PanelSpec } from './viewer/painter';
import type { PanelKind } from './viewer/decor';

export type Lang = 'zh' | 'en';

export const LANGS: Lang[] = ['zh', 'en'];

/** 界面文案（菜单、按钮、面板标题等）——随语言切换 */
export interface UiText {
  /** 文档标题 */
  title: string;
  loading: string;
  loadError: string;
  qualityHigh: string;
  qualityMedium: string;
  qualityLow: string;
  /** 语言按钮上显示的「另一种语言」 */
  langButton: string;
  langTitle: string;
  routePick: string;
  routeStart: string;
  subtitleLabel: string;
  subBoth: string;
  subZh: string;
  subEn: string;
  tourStart: string;
  tourPause: string;
  tourResume: string;
  tourPrev: string;
  tourNext: string;
  tourExit: string;
  tourStation: (i: number, total: number) => string;
  tourAutoPaused: string;
  tourFollow: string;
  inspect: string;
  inspectMode: string;
  viewFull: string;
  viewTop: string;
  viewRim: string;
  viewBottom: string;
  fillAzim: string;
  fillIntensity: string;
  inspectHint: string;
  gotIt: string;
  exitInspect: string;
  enterInspect: string;
  close: string;
}

export const UI: Record<Lang, UiText> = {
  zh: {
    title: '虚拟文物3D展厅',
    loading: '加载中…',
    loadError: '内容加载失败',
    qualityHigh: '高画质',
    qualityMedium: '中画质',
    qualityLow: '低画质',
    langButton: 'English',
    langTitle: '切换语言 / Switch language',
    routePick: '选择导览路线…',
    routeStart: '开始导览',
    subtitleLabel: '字幕语言',
    subBoth: '双语字幕',
    subZh: '仅中文',
    subEn: '仅英文',
    tourStart: '开始导览',
    tourPause: '⏸ 暂停',
    tourResume: '▶ 继续',
    tourPrev: '⏮ 上一站',
    tourNext: '下一站 ⏭',
    tourExit: '✕ 退出',
    tourStation: (i, total) => `第 ${i}/${total} 站`,
    tourAutoPaused: '已因手动操作暂停导览',
    tourFollow: '继续跟随导览',
    inspect: '鉴赏',
    inspectMode: '鉴赏模式',
    viewFull: '全貌',
    viewTop: '俯瞰',
    viewRim: '口沿',
    viewBottom: '翻转看底',
    fillAzim: '补光方位',
    fillIntensity: '补光强度',
    inspectHint: '拖拽环绕 · 滚轮/双指捏合抵近观察 · 点击金色圆点看细节 · Esc 退出',
    gotIt: '知道了',
    exitInspect: '退出鉴赏',
    enterInspect: '进入鉴赏',
    close: '关闭'
  },
  en: {
    title: 'Virtual Artifact 3D Gallery',
    loading: 'Loading…',
    loadError: 'Failed to load content',
    qualityHigh: 'High quality',
    qualityMedium: 'Medium quality',
    qualityLow: 'Low quality',
    langButton: '中文',
    langTitle: 'Switch language',
    routePick: 'Select a tour route…',
    routeStart: 'Start tour',
    subtitleLabel: 'Subtitle language',
    subBoth: 'Bilingual',
    subZh: 'Chinese only',
    subEn: 'English only',
    tourStart: 'Start tour',
    tourPause: '⏸ Pause',
    tourResume: '▶ Resume',
    tourPrev: '⏮ Previous',
    tourNext: 'Next ⏭',
    tourExit: '✕ Exit',
    tourStation: (i, total) => `Stop ${i}/${total}`,
    tourAutoPaused: 'Tour paused — you took manual control',
    tourFollow: 'Resume following the tour',
    inspect: 'Inspect',
    inspectMode: 'Inspect Mode',
    viewFull: 'Full view',
    viewTop: 'Top view',
    viewRim: 'Rim',
    viewBottom: 'Underside',
    fillAzim: 'Fill light azimuth',
    fillIntensity: 'Fill light intensity',
    inspectHint: 'Drag to orbit · Scroll or pinch to move closer · Click a gold dot for details · Esc to exit',
    gotIt: 'Got it',
    exitInspect: 'Exit inspect',
    enterInspect: 'Inspect closely',
    close: 'Close'
  }
};

/**
 * 墙面讲解展板文案：中文大字为主、英文小字附于下方，同屏双语呈现。
 * 与国内博物馆展板做法一致 —— 墙面文字不随界面语言切换。
 */
export const PANEL_SPECS: Record<PanelKind, PanelSpec> = {
  intro: {
    title: '前　言',
    subtitle: '华夏文明 · 器以载道',
    subtitleEn: 'PREFACE · Vessels as Vehicles of the Way',
    body: [
      '青铜礼器铸于庙堂，瓷器雅器兴于市井。',
      '本展厅以「青铜礼制」与「宋代雅趣」两条主线，',
      '呈现三千年间中国人对器物之美的追求：',
      '从鼎簋的庄严，到茶盏的素雅。',
      '请放慢脚步，与历史对视。'
    ],
    bodyEn:
      'Bronze ritual vessels were cast for the ancestral temple, while porcelain and refined wares flourished in market and study. Two threads guide this hall — "Bronze Ritual Order" and "Song Elegance" — across three millennia of Chinese taste for objects: from the solemnity of the ding and gui to the plainness of a tea bowl. Slow your step, and meet history eye to eye.',
    footer: '虚拟文物展厅 · 观众导览',
    footerEn: 'Virtual Artifact Gallery · Visitor Guide'
  },
  bronze: {
    title: '青铜礼制',
    subtitle: '商周 · 王权与秩序的金属表达',
    subtitleEn: 'BRONZE RITUAL ORDER · Power and Order Cast in Metal',
    body: [
      '鼎立国，簋承食，钟鸣鼎食之家。',
      '商周青铜器以饕餮纹为骨，云雷纹为衣，',
      '长篇铭文铸于腹壁，记录册命与征伐。',
      '列鼎制度：天子九鼎，诸侯七，大夫五。',
      '一件礼器，就是一部礼乐制度的注脚。'
    ],
    bodyEn:
      'The ding founded the state and the gui served the grain; sets of bronzes marked the houses of bells and cauldrons. Shang-Zhou vessels took the taotie mask as bone and thunder patterns as garment, while long inscriptions cast within their walls recorded investiture and warfare. Nine ding for the Son of Heaven, seven for a lord, five for a minister - a single vessel is a footnote to an entire ritual order.',
    footer: '青铜礼制展区 · 单元说明',
    footerEn: 'Bronze Ritual Zone · Gallery Notes'
  },
  song: {
    title: '宋代雅趣',
    subtitle: '两宋 · 极简美学与文人生活',
    subtitleEn: 'SONG ELEGANCE · Minimal Aesthetics and Literati Life',
    body: [
      '宋人尚意，器求素雅。',
      '汝窑天青，定窑牙白，梅瓶丰肩敛腹。',
      '焚香、点茶、挂画、插花，四般闲事。',
      '釉色之内，是文人对天地留白的理解。'
    ],
    bodyEn:
      'The Song sought meaning, and its wares sought plainness: Ru ware in sky-blue, Ding ware in ivory-white, the meiping broad of shoulder and narrow of foot. Incense, tea, hanging scrolls and flowers made up the four idle pursuits. Within the glaze lies the literati understanding of blank space.',
    footer: '宋代雅趣展区 · 单元说明',
    footerEn: 'Song Elegance Zone · Gallery Notes'
  },
  history: {
    title: '千年流转',
    subtitle: '从庙堂重器到书斋清玩',
    subtitleEn: 'A THOUSAND YEARS · From Temple Bronzes to Studio Treasures',
    body: [
      '西周：钟鼎铭功，礼乐定序。',
      '汉唐：丝路往来，胡风西来。',
      '两宋：士人审美，由庄入雅。',
      '明清：仿古与创新并行，器物走入日常。',
      '本次展陈八件文物，纵贯三千年。'
    ],
    bodyEn:
      'Western Zhou: bells and cauldrons record merit, and ritual order is set. Han and Tang: the Silk Road brings foreign winds westward. Song: literati taste turns from solemn to refined. Ming and Qing: archaism and invention side by side, as objects enter daily life. Eight artefacts on view span three thousand years.',
    footer: '历史沿革 · 通柜展线',
    footerEn: 'Gallery History · Display Line'
  }
};
