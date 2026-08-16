const LITE_DEVICE_MEMORY_GB = 4;
const LITE_HARDWARE_CONCURRENCY = 4;

export const GLASS_MODE_STORAGE_KEY = 'zypo_glass_mode';
export const GLASS_MODE_CHANGE_EVENT = 'zypo:glass-mode-change';

export type GlassMode = 'auto' | 'full' | 'lite' | 'off';

type AndroidGlassNavigator = {
  userAgent?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

type AndroidGlassDocument = {
  documentElement: {
    classList: {
      add: (...tokens: string[]) => void;
      contains?: (token: string) => boolean;
      remove?: (...tokens: string[]) => void;
    };
  };
};

type GlassModeStorage = {
  getItem: (key: string) => string | null;
};

export function readGlassMode(storageValue: GlassModeStorage = localStorage): GlassMode {
  try {
    const storedMode = storageValue.getItem(GLASS_MODE_STORAGE_KEY);
    if (storedMode === 'full' || storedMode === 'lite' || storedMode === 'off') return storedMode;
    return 'auto';
  } catch {
    return 'auto';
  }
}

function setProfileClass(
  classList: AndroidGlassDocument['documentElement']['classList'],
  className: string,
  enabled: boolean,
) {
  const isEnabled = classList.contains?.(className) ?? false;
  if (enabled && !isEnabled) classList.add(className);
  if (!enabled && isEnabled) classList.remove?.(className);
}

export function applyGlassProfile(
  mode: GlassMode,
  navigatorValue: AndroidGlassNavigator = navigator,
  documentValue: AndroidGlassDocument = document,
) {
  const userAgent = navigatorValue.userAgent || '';
  const isAndroid = /Android/i.test(userAgent);
  const root = documentValue.documentElement;

  // 'off' — глобальное отключение всего стекла для любых устройств.
  if (mode === 'off') {
    setProfileClass(root.classList, 'android-glass', false);
    setProfileClass(root.classList, 'android-glass-lite', false);
    setProfileClass(root.classList, 'android-glass-off', true);
    return false;
  }

  // Покидаем off-режим при смене настройки.
  setProfileClass(root.classList, 'android-glass-off', false);

  if (mode === 'full' || (mode === 'auto' && !isAndroid)) {
    setProfileClass(root.classList, 'android-glass-lite', false);
    setProfileClass(root.classList, 'android-glass', false);
    return false;
  }

  setProfileClass(root.classList, 'android-glass', true);

  const deviceMemory = Number(navigatorValue.deviceMemory || 0);
  const hardwareConcurrency = Number(navigatorValue.hardwareConcurrency || 0);
  const hasLowMemory = deviceMemory > 0 && deviceMemory <= LITE_DEVICE_MEMORY_GB;
  const hasFewCores = hardwareConcurrency > 0 && hardwareConcurrency <= LITE_HARDWARE_CONCURRENCY;
  const useLiteProfile = mode === 'lite' || (mode === 'auto' && (hasLowMemory || hasFewCores));

  setProfileClass(root.classList, 'android-glass-lite', useLiteProfile);

  return true;
}

