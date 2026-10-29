'use client';

import { useEffect, useState } from 'react';

import { AncialAPI } from '../../lib/api-v2';
import { cache } from '../../lib/cache.ts';
import type { PulseTrack } from '../../pulse/pulse-components';

type RawTrack = PulseTrack & { id?: number | string; img?: string; name?: string };

/** Ответ GetTrack.php: поля id/name/img — сырой вариант полей sid/title/artwork. */
export function mapPreviewTrack(raw: RawTrack): PulseTrack {
  return {
    ...raw,
    artwork: raw.artwork || (raw.img ? [{ src: raw.img }] : []),
    sid: raw.sid || raw.id,
    title: raw.title || raw.name,
  };
}

const cacheKey = (trackId: string | number) => `preview_track_${trackId}`;
const cacheOptions = { category: 'chats', subcategory: 'previews' } as const;

/** Трек Pulse по номеру (для превью в чате и списков из переписки): из кэша мгновенно, затем обновление с сервера. */
export function useTrackById(trackId: string | number): { error: boolean; track: PulseTrack | null } {
  const [track, setTrack] = useState<PulseTrack | null>(() => cache.get<PulseTrack>(cacheKey(trackId), cacheOptions) ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AncialAPI.getTrack<{ track?: RawTrack }>(trackId)
      .then((res) => {
        if (!mounted) return;
        const raw = res?.track;
        if (raw && (raw.sid || raw.id)) {
          const mapped = mapPreviewTrack(raw);
          setTrack(mapped);
          cache.set(cacheKey(trackId), mapped, { ...cacheOptions, ttl: 24 * 60 * 60 * 1000 });
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [trackId]);

  return { error: error && !track, track };
}
