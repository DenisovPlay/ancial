'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { SettingsItem } from '../../components/settings-item';
import { AncialAPI } from '../../lib/api-v2';
import { availableLocales, type SupportedLang } from '../../locales';
import {
  GLASS_MODE_CHANGE_EVENT,
  GLASS_MODE_STORAGE_KEY,
  applyGlassProfile,
  readGlassMode,
  type GlassMode,
} from '../../lib/android-glass';

function subscribeGlassMode(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === GLASS_MODE_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(GLASS_MODE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(GLASS_MODE_CHANGE_EVENT, onStoreChange);
  };
}

const getServerGlassMode = (): GlassMode => 'auto';

function getAutoResolvedMode(): 'full' | 'lite' {
  if (typeof window === 'undefined') return 'full';
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  if (!isAndroid) return 'full';
  const deviceMemory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0);
  const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
  const hasLowMemory = deviceMemory > 0 && deviceMemory <= 4;
  const hasFewCores = hardwareConcurrency > 0 && hardwareConcurrency <= 4;
  return hasLowMemory || hasFewCores ? 'lite' : 'full';
}

export default function UiSettingsContent() {
  const router = useRouter();
  const { showNote } = useNotification();
  const { isAuthenticated, lang, langCode, setLanguage } = useAuth();
  const glassMode = useSyncExternalStore(subscribeGlassMode, readGlassMode, getServerGlassMode);

  const autoResolvedMode = useMemo(() => {
    return getAutoResolvedMode();
  }, []);

  const autoResolvedLabel =
    autoResolvedMode === 'lite'
      ? lang?.glass_mode_lite || 'Облегчённое'
      : lang?.glass_mode_full || 'Полное';

  const glassModeOptions: {
    value: GlassMode;
    label: string;
    shortLabel: string;
    description: string;
  }[] = useMemo(
    () => [
      {
        value: 'off',
        label: lang?.glass_mode_off || 'Отключено',
        shortLabel: lang?.glass_mode_off || 'Откл',
        description: lang?.glass_mode_off_desc || 'Размытие выключено для наилучшей производительности.',
      },
      {
        value: 'lite',
        label: lang?.glass_mode_lite || 'Облегчённое',
        shortLabel: lang?.glass_mode_lite || 'Лайт',
        description: lang?.glass_mode_lite_desc || 'Оптимизированное размытие для плавной работы.',
      },
      {
        value: 'full',
        label: lang?.glass_mode_full || 'Полное',
        shortLabel: lang?.glass_mode_full || 'Полное',
        description: lang?.glass_mode_full_desc || 'Максимальные эффекты размытия и полупрозрачности.',
      },
      {
        value: 'auto',
        label: lang?.glass_mode_auto || 'Авто',
        shortLabel: lang?.glass_mode_auto || 'Авто',
        description: lang?.glass_mode_auto_desc || 'Автоматическая настройка под мощность устройства',
      },
    ],
    [lang]
  );

  const glassIdx = useMemo(() => {
    const idx = glassModeOptions.findIndex((o) => o.value === glassMode);
    return idx >= 0 ? idx : 3;
  }, [glassMode, glassModeOptions]);

  const selectLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value as SupportedLang;
    setLanguage(selectedLang);
    try {
      if (isAuthenticated) {
        await AncialAPI.updateProfile<{ lang?: string }>({ lang: selectedLang });
      }
      showNote({
        content: lang?.language_updated || 'Язык успешно изменён!',
        type: 'success',
      });
    } catch {
      showNote({
        content: lang?.language_update_error || 'Ошибка при смене языка',
        type: 'error',
      });
    }
  };

  const handleSelectGlassMode = (selectedMode: GlassMode) => {
    try {
      window.localStorage.setItem(GLASS_MODE_STORAGE_KEY, selectedMode);
    } catch {
      // The mode still applies for the current page if storage is unavailable.
    }
    applyGlassProfile(selectedMode);
    window.dispatchEvent(new Event(GLASS_MODE_CHANGE_EVENT));
  };

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-cyan-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.interface_settings || 'Интерфейс'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        {/* Glass Effects Section */}
        <div className="p-1.5 bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-600/30 flex flex-col gap-3 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-cyan-400" viewBox="0 0 48 48">
                    <use href="#IC-full-mode"></use>
                  </svg>
                </div>
                <span className="text-lg text-white">
                  {lang?.glass_effects || 'Эффекты стекла'}
                </span>
              </div>
              <span className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {glassModeOptions[glassIdx]?.description}
              </span>
            </div>

            {/* Glass Box Preview over background */}
            <div className="w-full sm:w-52 h-20 sm:-mt-3 sm:-mr-3 shrink-0 relative overflow-hidden flex items-center justify-center select-none">
              <div className="absolute inset-0 bg-zinc-950 pointer-events-none">
                <Image
                  src="/img/backgrounds/bg.webp"
                  alt="Glass preview background"
                  fill
                  sizes="160px"
                  className="object-cover pointer-events-none select-none"
                  draggable={false}
                />
              </div>
              <div className="absolute left-0 inset-y-0 w-10 bg-gradient-to-r from-zinc-900 via-transparent to-transparent"></div>
              <div className="absolute right-0 inset-y-0 w-10 bg-gradient-to-l from-zinc-900 via-transparent to-transparent"></div>
              <div className="absolute top-0 left-0 inset-x-0 h-10 bg-gradient-to-b from-zinc-900 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 inset-x-0 h-10 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>

              <div data-app-nav="glass-preview" className="relative z-10 w-32 h-10 rounded-3xl border border-zinc-600/30 bg-zinc-900/50 backdrop-blur-md duration-300 shadow-xl flex items-center gap-2 max-w-[90%]"></div>
            </div>
          </div>

          {/* Slider matching /settings/cache style */}
          <div className="flex flex-col gap-3">
            <input
              type="range"
              min={0}
              max={glassModeOptions.length - 1}
              step={1}
              value={glassIdx}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (glassModeOptions[idx]) {
                  handleSelectGlassMode(glassModeOptions[idx].value);
                }
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
            />
            <div className="-mt-1.5 flex justify-between px-1 text-[11px] font-medium text-zinc-400 select-none">
              {glassModeOptions.map((opt, i) => (
                <span
                  key={opt.value}
                  onClick={() => handleSelectGlassMode(opt.value)}
                  className={`cursor-pointer duration-300 hover:text-white ${i === glassIdx ? 'text-cyan-400 font-bold' : ''
                    }`}
                >
                  {opt.shortLabel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          <SettingsItem
            title={lang?.language || 'Язык'}
            iconBgClass="bg-red-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-red-500" viewBox="0 0 48 48">
                <use href="#IC-globe"></use>
              </svg>
            }
            rightContent={
              <select
                onChange={selectLanguage}
                value={langCode}
                className="focus:outline-0 focus:ring-0 bg-zinc-700/70 hover:bg-zinc-700/60 duration-300 p-1 rounded-2xl mr-2 shadow cursor-pointer text-white border-0 focus:ring-0"
              >
                {availableLocales.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.title}
                  </option>
                ))}
              </select>
            }
          />
        </div>
      </div>

      <div className="lg:hidden">
        <br /><br /><br /><br />
      </div>
    </div>
  );
}
