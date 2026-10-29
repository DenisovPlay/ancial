'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { APPEARANCE_CHANGE_EVENT, type LyricsMotion, type PulseColorSetting } from './appearance';

export type AppearanceMotion = {
  /** Отзывчивое меню: магнит, блик и «желе» нав-пиллов и панелей звонка. */
  nav: boolean;
  /** Отзывчивые дропдауны: те же эффекты у пунктов меню. */
  menu: boolean;
  tooltips: 'smooth' | 'instant';
  lyrics: LyricsMotion;
  /** Плавное раскрытие длинных постов и разделов. */
  expand: boolean;
  /** Телефон: панели навигации прячутся при прокрутке вниз. */
  scrollHide: boolean;
  /** Чем Pulse подкрашивает плееры и страницы. */
  pulseColor: PulseColorSetting;
};

// SSR не знает настроек устройства: рендерим как «по умолчанию на ПК», клиент уточнит после гидратации.
const SERVER_SNAPSHOT = 'on|on|smooth|words|on|off|cover';

function subscribe(onChange: () => void) {
  window.addEventListener(APPEARANCE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, onChange);
}

/** Флаги пишет на <html> applyAppearance (inline-скрипт и сохранение настроек) — читаем их оттуда. */
function getSnapshot() {
  const root = document.documentElement;
  return [
    root.getAttribute('data-motion-nav') ?? 'on',
    root.getAttribute('data-motion-menu') ?? 'on',
    root.getAttribute('data-motion-tooltips') ?? 'smooth',
    root.getAttribute('data-motion-lyrics') ?? 'words',
    root.getAttribute('data-motion-expand') ?? 'on',
    root.getAttribute('data-motion-scrollhide') ?? 'off',
    root.getAttribute('data-pulse-color') ?? 'cover',
  ].join('|');
}

/** Настройки анимаций интерфейса для JS-эффектов (framer-motion, подсказки, текст песен). */
export function useAppearanceMotion(): AppearanceMotion {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  return useMemo(() => {
    const [nav, menu, tooltips, lyrics, expand, scrollHide, pulseColor] = snapshot.split('|');
    return {
      nav: nav === 'on',
      menu: menu === 'on',
      tooltips: tooltips === 'instant' ? 'instant' : 'smooth',
      lyrics: lyrics === 'lines' ? 'lines' : 'words',
      expand: expand !== 'off',
      scrollHide: scrollHide === 'on',
      pulseColor: pulseColor === 'mood' || pulseColor === 'off' ? pulseColor : 'cover',
    };
  }, [snapshot]);
}
