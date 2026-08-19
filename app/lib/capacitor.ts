'use client';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isCapacitorNative = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

export const getCapacitorPlatform = (): 'android' | 'ios' | 'web' => {
  if (typeof window === 'undefined') return 'web';
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
};

/**
 * Инициализирует нативные обработчики Capacitor (Status bar, Splash screen, кнопка Back на Android)
 */
export const initCapacitor = (options?: {
  onBackButton?: () => boolean | void;
}) => {
  if (!isCapacitorNative()) return () => {};

  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('capacitor-native', `capacitor-${Capacitor.getPlatform()}`);
  }

  // Настройка нативного статус-бара: отключаем overlay, чтобы Android выделял статус-бар сверху
  try {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
    }
  } catch {
    // ignore
  }

  // Плавное скрытие сплэш-скрина
  try {
    SplashScreen.hide().catch(() => {});
  } catch {
    // ignore
  }

  // Обработка аппаратной кнопки «Назад» на Android
  let backListener: { remove: () => void } | null = null;
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (options?.onBackButton) {
        const handled = options.onBackButton();
        if (handled) return;
      }

      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    }).then((handle) => {
      backListener = handle;
    }).catch(() => {});
  } catch {
    // ignore
  }

  return () => {
    if (backListener) {
      backListener.remove();
    }
  };
};
