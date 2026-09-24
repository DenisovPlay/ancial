/**
 * Внешний вид интерфейса: стекло (размытие и подложки) и анимации. Хранится на устройстве —
 * стекло и эффекты упираются в мощность конкретного телефона или ПК, синхронизировать их незачем.
 *
 * Как применяется:
 *  - applyAppearance() считает множители ролей стекла и флаги анимаций и пишет их на <html>:
 *    CSS-переменные --glass-<роль>-{blur,sat,clarity}-k (их читают утилиты glass-* в globals.css)
 *    и data-motion-* (их читают CSS и хук useAppearanceMotion);
 *  - та же функция целиком уходит inline-скриптом в <head> (APPEARANCE_BOOT_SCRIPT) — до гидратации,
 *    без мигания. Поэтому она самодостаточна: никаких ссылок на внешние константы и хелперы.
 */

export type GlassPreset = 'auto' | 'full' | 'lite' | 'off' | 'custom';
export type GlassRole = 'nav' | 'menu' | 'tooltip' | 'input' | 'panel' | 'overlay';
export type MotionToggle = 'auto' | 'on' | 'off';
export type TooltipMotion = 'auto' | 'smooth' | 'instant';
export type LyricsMotion = 'words' | 'lines';
export type LyricsSetting = 'auto' | LyricsMotion;

export type GlassRoleSetting = {
  on: boolean;
  /** Сила размытия и насыщенности роли, 0–2 (1 — как в дизайне). */
  level: number;
};

export type AppearanceSettings = {
  glass: {
    preset: GlassPreset;
    /** Общие множители для «Своего» пресета, 0–2: размытие, прозрачность подложек, насыщенность. */
    blur: number;
    clarity: number;
    saturate: number;
    roles: Record<GlassRole, GlassRoleSetting>;
  };
  motion: {
    nav: MotionToggle;
    menu: MotionToggle;
    tooltips: TooltipMotion;
    lyrics: LyricsSetting;
    /** Плавное раскрытие длинных постов и разделов настроек. */
    expand: MotionToggle;
  };
};

export type ResolvedAppearance = {
  /** Пресет, который реально действует («Авто» раскрыт в full/lite). */
  preset: Exclude<GlassPreset, 'auto'>;
  /** Общие множители, которые сейчас действуют (для ползунков в настройках). */
  global: { blur: number; clarity: number; saturate: number };
  factors: Record<GlassRole, { blur: number; sat: number; clarity: number }>;
  motion: { nav: boolean; menu: boolean; tooltips: 'smooth' | 'instant'; lyrics: LyricsMotion; expand: boolean };
  device: { android: boolean; weak: boolean; reducedMotion: boolean };
};

export const GLASS_ROLES: GlassRole[] = ['nav', 'menu', 'tooltip', 'input', 'panel', 'overlay'];
export const APPEARANCE_STORAGE_KEY = 'zypo_appearance';
export const APPEARANCE_CHANGE_EVENT = 'zypo:appearance-change';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  glass: {
    preset: 'auto',
    blur: 1,
    clarity: 1,
    saturate: 1,
    roles: {
      nav: { on: true, level: 1 },
      menu: { on: true, level: 1 },
      tooltip: { on: true, level: 1 },
      input: { on: true, level: 1 },
      panel: { on: true, level: 1 },
      overlay: { on: true, level: 1 },
    },
  },
  motion: { nav: 'auto', menu: 'auto', tooltips: 'auto', lyrics: 'auto', expand: 'auto' },
};

type DeviceHints = {
  userAgent?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  reducedMotion?: boolean;
};

/**
 * Настройки (или сохранённые в localStorage, если не переданы) → действующие значения; apply — записать на <html>.
 * САМОДОСТАТОЧНА: уходит в inline-скрипт через toString(). Внутри — только свои локальные значения.
 */
export function applyAppearance(input?: unknown, apply = true, hints?: DeviceHints): ResolvedAppearance {
  const ROLES = ['nav', 'menu', 'tooltip', 'input', 'panel', 'overlay'];
  const KEY = 'zypo_appearance';
  const LEGACY_KEY = 'zypo_glass_mode';
  const hasWindow = typeof window !== 'undefined';

  function num(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : NaN;
    return isFinite(n) ? Math.min(2, Math.max(0, n)) : fallback;
  }
  function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
    return allowed.indexOf(value as T) >= 0 ? (value as T) : fallback;
  }

  let raw: Record<string, unknown> | null = null;
  if (input && typeof input === 'object') {
    raw = input as Record<string, unknown>;
  } else if (input === undefined && hasWindow) {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored) {
        raw = JSON.parse(stored);
      } else {
        // Перенос старой настройки «Эффекты стекла» (off / lite / full / auto).
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) raw = { glass: { preset: legacy } };
      }
    } catch {
      raw = null;
    }
  }

  const glassRaw = (raw && typeof raw.glass === 'object' && raw.glass ? raw.glass : {}) as Record<string, unknown>;
  const motionRaw = (raw && typeof raw.motion === 'object' && raw.motion ? raw.motion : {}) as Record<string, unknown>;
  const rolesRaw = (glassRaw.roles && typeof glassRaw.roles === 'object' ? glassRaw.roles : {}) as Record<string, Record<string, unknown>>;

  const nav = hints || (hasWindow ? (navigator as Navigator & { deviceMemory?: number }) : null);
  const userAgent = (nav && nav.userAgent) || '';
  const android = /Android/i.test(userAgent);
  const memory = Number((nav && nav.deviceMemory) || 0);
  const cores = Number((nav && nav.hardwareConcurrency) || 0);
  const weak = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
  const reducedMotion = hints
    ? Boolean(hints.reducedMotion)
    : hasWindow && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const chosen = pick(glassRaw.preset, ['auto', 'full', 'lite', 'off', 'custom'], 'auto');
  // «Авто»: на Android — облегчённое стекло (Chromium там дорого перерисовывает размытие), иначе полное.
  const preset = chosen === 'auto' ? (android ? 'lite' : 'full') : chosen;

  let global = { blur: 1, clarity: 1, saturate: 1 };
  if (preset === 'lite') {
    global = android && weak && chosen === 'auto' ? { blur: 0.17, clarity: 1, saturate: 0.05 } : { blur: 0.33, clarity: 1, saturate: 0.2 };
  } else if (preset === 'off') {
    // «Выкл» — те же роли, но без размытия и с непрозрачными подложками: ползунки «Своего» стартуют отсюда плавно.
    global = { blur: 0, clarity: 0, saturate: 0 };
  } else if (preset === 'custom') {
    global = { blur: num(glassRaw.blur, 1), clarity: num(glassRaw.clarity, 1), saturate: num(glassRaw.saturate, 1) };
  }

  const factors = {} as Record<GlassRole, { blur: number; sat: number; clarity: number }>;
  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i] as GlassRole;
    const roleRaw = preset === 'custom' && rolesRaw[role] && typeof rolesRaw[role] === 'object' ? rolesRaw[role] : {};
    const on = roleRaw.on !== false;
    const level = num(roleRaw.level, 1);
    // Затемнение под модалкой не бывает сплошным — иначе модалка закроет страницу целиком.
    const clarityFloor = role === 'overlay' ? 0.75 : 0;
    factors[role] = on
      ? { blur: global.blur * level, sat: global.saturate * level, clarity: Math.max(clarityFloor, global.clarity) }
      // Выключенная роль: без размытия и с непрозрачной подложкой.
      : { blur: 0, sat: 0, clarity: clarityFloor };
  }

  const toggle = function (value: unknown) {
    const mode = pick(value, ['auto', 'on', 'off'], 'auto');
    // Отзывчивые эффекты (магнит, блик, желе) на Android выключены по умолчанию — это лишняя работа на каждый кадр.
    return mode === 'auto' ? !android && !reducedMotion : mode === 'on';
  };
  const tooltips = pick(motionRaw.tooltips, ['auto', 'smooth', 'instant'], 'auto');
  // Раскрытие и заливка текста по словам — работа на каждый кадр: на слабых Android по умолчанию выключены.
  const weakAndroid = android && weak;
  const expandMode = pick(motionRaw.expand, ['auto', 'on', 'off'], 'auto');
  const lyricsMode = pick(motionRaw.lyrics, ['auto', 'words', 'lines'], 'auto');

  const resolved: ResolvedAppearance = {
    preset: preset as ResolvedAppearance['preset'],
    global: global,
    factors: factors,
    motion: {
      nav: toggle(motionRaw.nav),
      menu: toggle(motionRaw.menu),
      tooltips: tooltips === 'auto' ? (reducedMotion ? 'instant' : 'smooth') : tooltips,
      lyrics: lyricsMode === 'auto' ? (weakAndroid || reducedMotion ? 'lines' : 'words') : lyricsMode,
      expand: expandMode === 'auto' ? !reducedMotion && !weakAndroid : expandMode === 'on',
    },
    device: { android: android, weak: weak, reducedMotion: Boolean(reducedMotion) },
  };

  if (apply && typeof document !== 'undefined') {
    const root = document.documentElement;
    for (let j = 0; j < ROLES.length; j++) {
      const f = factors[ROLES[j] as GlassRole];
      root.style.setProperty('--glass-' + ROLES[j] + '-blur-k', String(Math.round(f.blur * 1000) / 1000));
      root.style.setProperty('--glass-' + ROLES[j] + '-sat-k', String(Math.round(f.sat * 1000) / 1000));
      root.style.setProperty('--glass-' + ROLES[j] + '-clarity-k', String(Math.round(f.clarity * 1000) / 1000));
    }
    root.setAttribute('data-glass', resolved.preset);
    root.setAttribute('data-motion-nav', resolved.motion.nav ? 'on' : 'off');
    root.setAttribute('data-motion-menu', resolved.motion.menu ? 'on' : 'off');
    root.setAttribute('data-motion-tooltips', resolved.motion.tooltips);
    root.setAttribute('data-motion-lyrics', resolved.motion.lyrics);
    root.setAttribute('data-motion-expand', resolved.motion.expand ? 'on' : 'off');
  }

  return resolved;
}

/** Inline-скрипт для <head>: применяет сохранённые настройки до первой отрисовки. */
export const APPEARANCE_BOOT_SCRIPT = `try{(${applyAppearance.toString()})()}catch(e){}`;

/** Сохранённая строка настроек (и старая настройка стекла) → полные настройки с значениями по умолчанию. */
export function parseAppearanceSettings(stored: string | null, legacy: string | null = null): AppearanceSettings {
  const result: AppearanceSettings = JSON.parse(JSON.stringify(DEFAULT_APPEARANCE));
  try {
    const parsed: { glass?: Partial<AppearanceSettings['glass']>; motion?: Partial<AppearanceSettings['motion']> } | null = stored
      ? JSON.parse(stored)
      : legacy ? { glass: { preset: legacy as GlassPreset } } : null;
    if (parsed?.glass) {
      Object.assign(result.glass, parsed.glass, { roles: { ...result.glass.roles, ...(parsed.glass.roles ?? {}) } });
    }
    if (parsed?.motion) Object.assign(result.motion, parsed.motion);
  } catch { /* битые настройки — значения по умолчанию */ }
  return result;
}

/** Сохранить, применить сразу и сообщить открытым компонентам (и другим вкладкам — через storage). */
export function saveAppearance(settings: AppearanceSettings): ResolvedAppearance {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
    window.localStorage.removeItem('zypo_glass_mode');
  } catch { /* best-effort: приватный режим */ }
  const resolved = applyAppearance(settings);
  window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
  return resolved;
}
