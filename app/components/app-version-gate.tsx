'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api-url';
import { APP_VERSION } from '../lib/app-version';
import { compareAppVersions } from '../lib/app-version-compare';
import { openExternalUrl } from '../lib/native-browser';
import { getAppPlatform } from '../lib/platform';

type AppConfigResponse = {
  success?: boolean;
  data?: { latest_version?: string; min_version?: string; update_url?: string };
};

type UpdateState = { kind: 'required' | 'available'; updateUrl: string; latest: string } | null;

const DISMISSED_KEY = 'zypo_app_update_dismissed';

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Приложение: проверка версии при старте (AppConfig.php). Ниже min_version — экран «Обновите
 * приложение» поверх всего; ниже latest_version — ненавязчивая карточка (скрывается до следующей версии).
 */
export default function AppVersionGate() {
  const { lang } = useAuth();
  const [update, setUpdate] = useState<UpdateState>(null);

  useEffect(() => {
    let active = true;
    fetch(apiUrl(`/api/V2/info/AppConfig.php?platform=${getAppPlatform()}`), { cache: 'no-store', credentials: 'omit' })
      .then((response) => (response.ok ? (response.json() as Promise<AppConfigResponse>) : null))
      .then((payload) => {
        const config = payload?.success ? payload.data : null;
        if (!active || !config?.update_url) return;
        const updateUrl = config.update_url;
        if (config.min_version && compareAppVersions(APP_VERSION, config.min_version) < 0) {
          setUpdate({ kind: 'required', latest: config.latest_version || config.min_version, updateUrl });
          return;
        }
        const latest = config.latest_version || '';
        if (latest && compareAppVersions(APP_VERSION, latest) < 0 && readDismissed() !== latest) {
          setUpdate({ kind: 'available', latest, updateUrl });
        }
      })
      .catch(() => {
        // Нет сети — не мешаем пользоваться приложением.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!update) return null;

  const openStore = () => {
    openExternalUrl(update.updateUrl).catch((error: unknown) => console.error('Failed to open store', error));
  };

  if (update.kind === 'required') {
    return (
      <div className="fixed inset-0 z-[2147483000] flex flex-col items-center justify-center gap-3 bg-black p-6 text-center">
        <span className="text-2xl font-bold text-white">{lang?.app_update_required_title || 'Нужно обновить приложение'}</span>
        <span className="max-w-sm text-zinc-300">
          {lang?.app_update_required_desc || 'Эта версия Zypo больше не поддерживается. Установите обновление, чтобы продолжить.'}
        </span>
        <button
          type="button"
          onClick={openStore}
          className="cursor-pointer rounded-full border border-zinc-600/30 bg-purple-700 px-4 py-2.5 text-zinc-100 duration-300 hover:bg-purple-800 active:scale-95"
        >
          {lang?.app_update_button || 'Обновить'}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[2147483000] flex justify-center p-3">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 shadow-lg">
        <span className="flex-1 text-sm text-zinc-200">{lang?.app_update_available || 'Доступна новая версия Zypo'}</span>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISSED_KEY, update.latest);
            } catch {
              // приватный режим — просто скрываем до перезапуска
            }
            setUpdate(null);
          }}
          className="cursor-pointer rounded-full px-3 py-2 text-sm text-zinc-300 duration-300 hover:bg-zinc-800 active:scale-95"
        >
          {lang?.app_update_later || 'Позже'}
        </button>
        <button
          type="button"
          onClick={openStore}
          className="cursor-pointer rounded-full border border-zinc-600/30 bg-purple-700 px-3 py-2 text-sm text-zinc-100 duration-300 hover:bg-purple-800 active:scale-95"
        >
          {lang?.app_update_button || 'Обновить'}
        </button>
      </div>
    </div>
  );
}
