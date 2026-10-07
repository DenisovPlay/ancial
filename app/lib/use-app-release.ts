import { useEffect, useState } from 'react';

import { AncialAPI } from './api-v2';

/** Релиз для платформы (AppConfig.php: latest из тега GitHub, файл — вложение релиза). */
export interface AppPlatformRelease {
  /** Прямая ссылка на APK/IPA; пусто, если у релиза нет файла платформы. */
  download_url?: string;
  file_size?: number;
  latest_version?: string;
  notes?: string;
  /** Страница релиза на GitHub. */
  release_url?: string;
}

export interface AppReleases {
  android?: AppPlatformRelease;
  ios?: AppPlatformRelease;
}

let cached: AppReleases | null = null;

/** Загружает версии/ссылки релизов один раз за сессию страницы; пока нет ответа — null (ссылки берём из запасных). */
export function useAppReleases(): AppReleases | null {
  const [releases, setReleases] = useState<AppReleases | null>(cached);
  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    AncialAPI.getAppReleases<AppReleases>()
      .then((data) => {
        cached = data;
        if (!cancelled) setReleases(data);
      })
      .catch((error: unknown) => console.error('Failed to load app releases', error));
    return () => {
      cancelled = true;
    };
  }, []);
  return releases;
}
