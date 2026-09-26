'use client';

import { useEffect, useState } from 'react';

import { isBackendPath, toBackendUrl } from './api-url';
import { backendFetch } from './auth-fetch';
import { isPrivateMediaSrc } from './image-host-match';
import { TRANSPARENT_PIXEL } from './image-loading';
import { IS_NATIVE_APP } from './platform';

/** Сколько blob-адресов приватных картинок держим в памяти (старые освобождаются). */
const PRIVATE_BLOB_LIMIT = 120;
const privateBlobUrls = new Map<string, string>();
const privateBlobRequests = new Map<string, Promise<string>>();

function rememberBlob(src: string, objectUrl: string) {
  privateBlobUrls.set(src, objectUrl);
  while (privateBlobUrls.size > PRIVATE_BLOB_LIMIT) {
    const [oldestSrc, oldestUrl] = privateBlobUrls.entries().next().value as [string, string];
    privateBlobUrls.delete(oldestSrc);
    URL.revokeObjectURL(oldestUrl);
  }
}

/** Приватная картинка бэкенда: запрос с Bearer (у <img> заголовков нет) → blob: URL. */
function loadPrivateImage(src: string): Promise<string> {
  const cached = privateBlobUrls.get(src);
  if (cached) return Promise.resolve(cached);
  let request = privateBlobRequests.get(src);
  if (!request) {
    request = backendFetch(src)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Private image request failed with status ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        rememberBlob(src, objectUrl);
        return objectUrl;
      })
      .finally(() => {
        privateBlobRequests.delete(src);
      });
    privateBlobRequests.set(src, request);
  }
  return request;
}

/**
 * Адрес картинки для <img> в приложении. Сайт: как есть (пути бэкенда проксирует Next, приватные
 * медиа авторизует кука). Приложение: пути бэкенда — абсолютные, приватные медиа (вложения чатов) —
 * через blob, пока грузится — прозрачный пиксель (AppImage держит скелетон).
 */
export function useNativeImageSrc(src: string | null | undefined): string | null | undefined {
  const isPrivate = IS_NATIVE_APP && Boolean(src) && isPrivateMediaSrc(String(src));
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    if (!isPrivate || !src) return undefined;
    let active = true;
    loadPrivateImage(src)
      .then((url) => {
        if (active) setResolved({ src, url });
      })
      .catch((error: unknown) => {
        console.error('Failed to load private image', error);
        // Ошибка: отдаём прямой адрес — AppImage покажет фолбэк/заглушку.
        if (active) setResolved({ src, url: toBackendUrl(src) });
      });
    return () => {
      active = false;
    };
  }, [isPrivate, src]);

  if (!IS_NATIVE_APP || !src) return src;
  if (isPrivate) {
    if (resolved?.src === src) return resolved.url;
    return privateBlobUrls.get(src) ?? TRANSPARENT_PIXEL;
  }
  return isBackendPath(src) ? toBackendUrl(src) : src;
}
