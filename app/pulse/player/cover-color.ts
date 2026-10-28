'use client';

import { useEffect, useState } from 'react';

import { apiUrl } from '../../lib/api-url';
import { IS_NATIVE_APP } from '../../lib/platform';

const SIZE = 24;
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('cover_load_failed'));
    image.src = src;
  });
}

/** Средний «яркий» цвет картинки: пиксели весом насыщенности, серые и почти чёрные/белые почти не влияют. */
function dominantColor(image: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, SIZE, SIZE);
  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    return null; // картинка с чужого домена без CORS — canvas «испорчен», цвета не достать
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const lightness = (max + min) / 510;
    const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    const weight = 0.05 + saturation * (1 - Math.abs(2 * lightness - 1));
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    total += weight;
  }
  if (!total) return null;
  r /= total;
  g /= total;
  b /= total;
  // В HSL: оттенок берём из обложки, насыщенность и яркость держим в рамках — чтобы текст поверх оставался читаемым.
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r / 255) hue = ((g - b) / 255 / delta) % 6;
    else if (max === g / 255) hue = (b - r) / 255 / delta + 2;
    else hue = (r - g) / 255 / delta + 4;
  }
  const saturation = Math.min(0.75, Math.max(0.3, delta === 0 ? 0 : delta / (1 - Math.abs(max + min - 1))));
  return `hsl(${Math.round((hue * 60 + 360) % 360)} ${Math.round(saturation * 100)}% 34%)`;
}

/** Обложка уже на странице — берём её же, без нового запроса (в браузере она в кэше, офлайн — в хранилище). Если ещё грузится, ждём до 1,5 с. */
function findPageImage(resolved: string): Promise<HTMLImageElement | null> {
  const encoded = encodeURIComponent(resolved);
  const image = Array.from(document.images).find((item) => item.currentSrc.includes(encoded) || item.currentSrc === resolved || item.src.includes(encoded));
  if (!image) return Promise.resolve(null);
  if (image.complete) return Promise.resolve(image.naturalWidth > 0 ? image : null);
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      window.clearTimeout(timer);
      resolve(ok && image.naturalWidth > 0 ? image : null);
    };
    const onLoad = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), 1500);
    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
  });
}

async function extract(url: string): Promise<string | null> {
  const resolved = apiUrl(url);
  // 1. Уже отрисованная обложка: оптимизатор Next отдаёт её с нашего домена, canvas не «портится».
  const loaded = await findPageImage(resolved);
  const fromLoaded = loaded ? dominantColor(loaded) : null;
  if (fromLoaded) return fromLoaded;
  // 2. Иначе грузим маленькую копию через оптимизатор (q — только 75: другие значения Next не разрешает), затем оригинал.
  const candidates = !IS_NATIVE_APP && /^(https?:)?\/\//.test(resolved)
    ? [`/_next/image?url=${encodeURIComponent(resolved)}&w=64&q=75`, resolved]
    : [resolved];
  for (const candidate of candidates) {
    try {
      const color = dominantColor(await loadImage(candidate));
      if (color) return color;
    } catch {
      // следующий источник
    }
  }
  return null;
}

/**
 * Доминирующий цвет обложки (кэшируется по адресу). null — функция выключена или цвета ещё не было ни разу.
 * Цвет прошлой обложки держится, пока считается новая или адрес на миг пуст (смена трека): слой плавно перекрашивается, а не мигает.
 */
export function useCoverColor(url: string | null | undefined, enabled: boolean): string | null {
  const key = enabled ? String(url ?? '').trim() : '';
  const [color, setColor] = useState<string | null>(() => (key ? cache.get(key) ?? null : null));

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const cached = cache.get(key);
    if (cached !== undefined) {
      // Кэш — мгновенно; сеттлер здесь источник правды (ключ сменился).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cached) setColor(cached);
      return undefined;
    }
    const job = pending.get(key) ?? extract(key).then((value) => {
      cache.set(key, value);
      pending.delete(key);
      return value;
    });
    pending.set(key, job);
    void job.then((value) => {
      // Не удалось достать цвет — остаёмся на прежнем, а не гасим слой рывком.
      if (!cancelled && value) setColor(value);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return enabled ? color : null;
}
