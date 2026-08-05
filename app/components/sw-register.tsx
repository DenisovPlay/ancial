'use client';

import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'ancial:sw-auto-reload-at';
const RELOAD_GUARD_MS = 15_000;

function canAutoReload(): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && Date.now() - last < RELOAD_GUARD_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function hardReloadForNewBuild() {
  if (!canAutoReload()) return;
  // cache-bust query, чтобы не залипнуть на старом HTML из любого промежуточного кэша
  const url = new URL(window.location.href);
  url.searchParams.set('_sw', String(Date.now()));
  window.location.replace(url.toString());
}

function isChunkLoadError(reason: unknown): boolean {
  const message =
    typeof reason === 'string'
      ? reason
      : reason && typeof reason === 'object' && 'message' in reason
        ? String((reason as { message?: unknown }).message || '')
        : '';

  return (
    /Loading chunk [\d]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // 1) Авто-активация нового SW без кнопки «Обновить»
    // Когда waiting SW становится active и берёт control — один hard reload,
    // чтобы текущая вкладка подтянула HTML/чанки нового билда.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      // Не релоадим, если это первая установка SW (раньше controller не было)
      // — иначе лишний reload при первом визите.
      // controllerchange после update = был старый controller, пришёл новый.
      refreshing = true;
      hardReloadForNewBuild();
    };

    // Запоминаем, был ли уже controlling SW до register
    const hadController = Boolean(navigator.serviceWorker.controller);
    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Принудительная проверка обновления при каждом запуске
        registration.update().catch(() => {});

        // Если уже есть waiting worker — просим его активироваться сразу
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Новый worker найден (installing → installed/waiting)
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            // installed + есть активный controller = update, не first install
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });

    // Прогрев HTML shell для cold offline open (после первого online-визита)
    const warmOfflineShell = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({
            type: 'WARM_URLS',
            urls: ['/', '/pulse', '/pulse/my', '/pulse/library', '/settings/cache'],
          });
        })
        .catch(() => {});
    };
    // Не блокируем first paint — прогрев чуть позже
    window.setTimeout(warmOfflineShell, 2500);

    // Периодическая проверка обновлений (вкладка открыта долго)
    const updateInterval = window.setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    }, 5 * 60 * 1000);

    // При возврате на вкладку — тоже check update + soft warm
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
        warmOfflineShell();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', warmOfflineShell);

    // 2) ChunkLoadError / dynamic import fail → hard reload за новым HTML
    // Это как раз кейс «страница ссылается на старые /_next/static чанки после деплоя»
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        console.warn('[SW] Chunk load failed, reloading for fresh build', event.reason);
        hardReloadForNewBuild();
      }
    };
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error || event.message)) {
        console.warn('[SW] Chunk load error, reloading for fresh build', event.error || event.message);
        hardReloadForNewBuild();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    return () => {
      window.clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', warmOfflineShell);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}
