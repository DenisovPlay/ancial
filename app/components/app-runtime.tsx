'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import AppDocumentViewer from './app-document-viewer';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AncialAPI } from '../lib/api-v2';
import { dispatchNativeOAuthReturn } from '../lib/native-oauth';
import AppVersionGate from './app-version-gate';
import { SITE_DOMAIN, SITE_URL } from '../config';
import { openExternalUrl } from '../lib/native-browser';
import { installNativeMediaSession } from '../pulse/player/native-media-session';

type PulseWindow = Window & { PlayerMode?: (mode: 'full' | 'mini') => void };

/** Ссылка сайта (App Link, custom scheme) → путь внутри приложения. null — чужой адрес. */
function toInAppPath(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');
    const isSite = (url.protocol === 'https:' || url.protocol === 'http:') && host === SITE_DOMAIN;
    const isScheme = url.protocol === 'cc.zypo.app:';
    if (!isSite && !isScheme) return null;
    // cc.zypo.app://pulse/track/1 — хост здесь первый сегмент пути.
    const path = isScheme ? `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/') : url.pathname;
    return `${path || '/'}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Оплата открывается на сайте в системном браузере (платёжные формы — не для WebView). */
function isPayPath(path: string) {
  return path === '/pay' || path.startsWith('/pay/') || path.startsWith('/pay?');
}

function hasOpenOverlay(): 'dialog' | 'menu' | null {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return 'dialog';
  if (document.querySelector('[data-dropdown-menu]')) return 'menu';
  return null;
}

/**
 * Нативная обвязка приложения (Capacitor). Монтируется только в сборке приложения (layout.tsx).
 */
export default function AppRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const { user, isAuthenticated, lang } = useAuth();
  const { showNote } = useNotification();
  const showNoteRef = useRef(showNote);

  useEffect(() => {
    showNoteRef.current = showNote;
  }, [showNote]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Медиасессия Pulse → нативный foreground-сервис (фоновая музыка, шторка, экран блокировки).
  useEffect(() => {
    installNativeMediaSession();
  }, []);

  // Кнопка «назад»: сначала закрыть открытое (модалка, меню, полный плеер), потом история, на корне — свернуть.
  useEffect(() => {
    let removed = false;
    let remove: (() => Promise<void>) | null = null;
    void import('@capacitor/app').then(({ App }) => App.addListener('backButton', ({ canGoBack }) => {
      const overlay = hasOpenOverlay();
      if (overlay === 'dialog') {
        // Modal и прочие окна закрываются по Escape.
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
        return;
      }
      if (overlay === 'menu') {
        // Dropdown закрывается кликом мимо меню.
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
        return;
      }
      if (document.documentElement.classList.contains('pulse-player-full')) {
        (window as PulseWindow).PlayerMode?.('mini');
        return;
      }
      const current = pathnameRef.current ?? '/';
      if (current === '/' || current === '') {
        void App.minimizeApp();
        return;
      }
      if (canGoBack) router.back();
      else router.replace('/');
    })).then((handle) => {
      if (removed) void handle.remove();
      else remove = () => handle.remove();
    });
    return () => {
      removed = true;
      void remove?.();
    };
  }, [router]);

  // Ссылки https://zypo.cc/… (App Links) и cc.zypo.app://… — открываются нужным экраном.
  useEffect(() => {
    const open = (rawUrl: string) => {
      // Возврат из входа через Яндекс/Telegram (cc.zypo.app://oauth?…) — не экран, а сигнал ожидающему входу.
      if (dispatchNativeOAuthReturn(rawUrl)) {
        void import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => {});
        return;
      }
      const path = toInAppPath(rawUrl);
      if (!path) return;
      if (isPayPath(path)) {
        openExternalUrl(`${SITE_URL}${path}`).catch((error: unknown) => console.error('Failed to open payment', error));
        return;
      }
      router.push(path);
    };
    let removed = false;
    let remove: (() => Promise<void>) | null = null;
    void import('@capacitor/app').then(async ({ App }) => {
      const launch = await App.getLaunchUrl().catch(() => undefined);
      if (launch?.url && !removed) open(launch.url);
      const handle = await App.addListener('appUrlOpen', ({ url }) => open(url));
      if (removed) void handle.remove();
      else remove = () => handle.remove();
    });
    return () => {
      removed = true;
      void remove?.();
    };
  }, [router]);

  // Push-уведомления: нажатие открывает нужный экран, пришедшее при открытом приложении — тост
  // (Android в этот момент сам его не показывает).
  useEffect(() => {
    let removed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    void import('@capacitor/push-notifications').then(async ({ PushNotifications }) => {
      const added = await Promise.all([
        PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          const link = String(notification.data?.click_action ?? '');
          const path = link ? toInAppPath(link) : null;
          router.push(path && !isPayPath(path) ? path : '/notifications');
        }),
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          const title = notification.title || String(notification.data?.title ?? '');
          const body = notification.body || String(notification.data?.body ?? '');
          if (!title && !body) return;
          showNoteRef.current({ content: title && body ? `${title}: ${body}` : title || body, type: 'info', time: 5 });
        }),
      ]);
      if (removed) added.forEach((handle) => void handle.remove());
      else handles.push(...added);
    }).catch((error: unknown) => console.error('Failed to init push listeners', error));
    return () => {
      removed = true;
      handles.forEach((handle) => void handle.remove());
    };
  }, [router]);

  // FCM может сменить токен устройства (переустановка сервисов, восстановление). Если подписка аккаунта —
  // это устройство (pushsid совпадает с последним отданным отсюда токеном), тихо обновляем pushsid.
  const pushsid = user?.pushsid ?? '';
  const pushChannelName = lang?.push_channel_name || 'Уведомления Zypo';
  useEffect(() => {
    if (!isAuthenticated || !pushsid || pushsid === '0') return undefined;
    let cancelled = false;
    void (async () => {
      const push = await import('../lib/native-push');
      const stored = push.getStoredNativePushToken();
      if (!stored || stored !== pushsid || !(await push.hasNativePushPermission())) return;
      const token = await push.registerNativePush(pushChannelName);
      if (!cancelled && token && token !== pushsid) {
        await AncialAPI.updateProfile({ pushsid: token });
      }
    })().catch((error: unknown) => console.error('Failed to refresh push token', error));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, pushsid, pushChannelName]);

  // Внешние ссылки и window.open — в системном браузере: WebView новых окон не открывает.
  useEffect(() => {
    const isExternal = (href: string) => {
      try {
        const url = new URL(href, window.location.href);
        return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== window.location.origin;
      } catch {
        return false;
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href') || '';
      if (!isExternal(href)) return;
      const inAppPath = toInAppPath(new URL(href, window.location.href).href);
      event.preventDefault();
      if (inAppPath && !isPayPath(inAppPath)) {
        router.push(inAppPath);
        return;
      }
      openExternalUrl(anchor.href).catch((error: unknown) => console.error('Failed to open link', error));
    };
    const nativeOpen = window.open;
    window.open = (url?: string | URL, target?: string, features?: string) => {
      const href = url ? String(url) : '';
      if (href && isExternal(href)) {
        openExternalUrl(new URL(href, window.location.href).href).catch((error: unknown) => console.error('Failed to open link', error));
        return null;
      }
      return nativeOpen.call(window, url, target, features);
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      window.open = nativeOpen;
    };
  }, [router]);

  // Оплата: адрес /pay в приложении — сразу на сайт в системном браузере.
  useEffect(() => {
    if (!pathname || !isPayPath(pathname)) return;
    const target = `${SITE_URL}${window.location.pathname}${window.location.search}`;
    openExternalUrl(target).catch((error: unknown) => console.error('Failed to open payment', error));
    if (window.history.length > 1) router.back();
    else router.replace('/');
  }, [pathname, router]);

  return (
    <>
      <AppDocumentViewer />
      <AppVersionGate />
    </>
  );
}
