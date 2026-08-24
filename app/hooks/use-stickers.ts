'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StickerItem {
  id: number;
  code: string;
  alias: string;
  shortcode: string;
  image_url: string;
  image_url_avif: string | null;
  width: number | null;
  height: number | null;
  is_animated: number;
}

export interface StickerPack {
  id: number;
  slug: string;
  title: string;
  icon_url: string;
  author: string | null;
  scope: 'all' | 'posts' | 'messages';
  sort_order: number;
  stickers: StickerItem[];
}

export type StickerScope = 'all' | 'posts' | 'messages';

// ─── In-memory cache (singleton, shared across all instances) ──────────────────

const packsCache: Partial<Record<StickerScope, StickerPack[]>> = {};
const inflightMap: Partial<Record<StickerScope, Promise<StickerPack[]>>> = {};

const RECENT_KEY = 'zypo_recent_stickers';
const MAX_RECENT = 20;

// ─── Recent stickers localStorage helpers ─────────────────────────────────────

export function getRecentStickers(): StickerItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StickerItem[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentSticker(sticker: StickerItem): void {
  try {
    const prev = getRecentStickers().filter((s) => s.code !== sticker.code);
    const next = [sticker, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchPacks(scope: StickerScope): Promise<StickerPack[]> {
  if (packsCache[scope]) return packsCache[scope]!;

  if (!inflightMap[scope]) {
    inflightMap[scope] = (async () => {
      try {
        const res = await fetch(`/api/V2/stickers/GetPacks.php?scope=${scope}`, {
          credentials: 'include',
          cache: 'default',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { success: boolean; data: { packs: StickerPack[] } };
        if (!json.success) throw new Error('API error');
        const packs = json.data.packs ?? [];
        packsCache[scope] = packs;
        return packs;
      } catch {
        return [];
      } finally {
        delete inflightMap[scope];
      }
    })();
  }

  return inflightMap[scope]!;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseStickersResult {
  packs: StickerPack[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  recentStickers: StickerItem[];
  pushRecent: (sticker: StickerItem) => void;
  flatSearch: (query: string) => StickerItem[];
}

export function useStickers(scope: StickerScope = 'all'): UseStickersResult {
  const [packs, setPacks] = useState<StickerPack[]>(() => packsCache[scope] ?? []);
  const [loading, setLoading] = useState<boolean>(!packsCache[scope]);
  const [error, setError] = useState(false);
  const [recentStickers, setRecentStickers] = useState<StickerItem[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // load recent from localStorage on client
  useEffect(() => {
    // Гидратация недавних стикеров из localStorage на клиенте — сеттлер источник правды (SSR не знает localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentStickers(getRecentStickers());
  }, []);

  const load = useCallback(async () => {
    if (packsCache[scope]) {
      setPacks(packsCache[scope]!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const result = await fetchPacks(scope);
    if (!mountedRef.current) return;
    if (!result.length) {
      setError(true);
    }
    setPacks(result);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    // Загрузка стикерпаков: сеттлеры внутри load после await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const reload = useCallback(() => {
    delete packsCache[scope];
    void load();
  }, [scope, load]);

  const pushRecent = useCallback((sticker: StickerItem) => {
    pushRecentSticker(sticker);
    setRecentStickers(getRecentStickers());
  }, []);

  const flatSearch = useCallback((query: string): StickerItem[] => {
    const q = query.toLowerCase().trim().replace(/^:|:$/g, '');
    if (!q) return [];
    const result: StickerItem[] = [];
    const seen = new Set<string>();
    for (const pack of packs) {
      for (const st of pack.stickers) {
        if (seen.has(st.code)) continue;
        const codeMatch = st.code.toLowerCase().includes(q);
        const aliasMatch = st.alias?.toLowerCase().includes(q);
        if (codeMatch || aliasMatch) {
          result.push(st);
          seen.add(st.code);
        }
      }
    }
    return result;
  }, [packs]);

  return { packs, loading, error, reload, recentStickers, pushRecent, flatSearch };
}
