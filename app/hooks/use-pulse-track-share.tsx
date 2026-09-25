'use client';

import { useCallback, useState } from 'react';

import ShareModal from '../components/share-modal';
import { useAuth } from '../context/AuthContext';
import {
  decodeHtmlEntities,
  getImageUrl,
  getTrackArtwork,
  normalizeText,
  toNumber,
  type PulseShareAttachment,
  type PulseTrack,
} from '../pulse/pulse-components';
import { getPulseExternalUrl } from '../pulse/pulse-navigation';

type ShowPulseNote = (content: string, type?: 'error' | 'info' | 'success', time?: number, html?: boolean) => void;

/**
 * «Поделиться треком»: ссылка на /pulse/track/<id> и карточка трека во вложении.
 * Возвращает действия и окно, которое нужно отрендерить рядом.
 * resolveId (как у usePulseTrackReport) превращает ext_-id в числовой. Без него ext_-ссылка
 * уходит как есть: GetTrack.php открывает и по внешнему id.
 */
export function usePulseTrackShare(
  showPulseNote: ShowPulseNote,
  resolveId?: (idValue: number | string | null | undefined) => Promise<number>,
) {
  const { lang } = useAuth();
  const [share, setShare] = useState<{ url: string; attachment: PulseShareAttachment | null } | null>(null);

  const copyTrackLink = useCallback(async (trackId: number | string, track?: PulseTrack) => {
    const rawId = normalizeText(String(trackId ?? ''));
    if (!rawId) return;
    let resolvedId = toNumber(rawId);
    if (!resolvedId && resolveId && rawId.startsWith('ext_')) {
      resolvedId = await resolveId(rawId);
    }
    const finalId = String(resolvedId || rawId);
    setShare({
      url: getPulseExternalUrl(`/pulse/track/${finalId}`),
      attachment: track ? {
        widgets: [{ type: 'music', track_id: finalId }],
        preview: {
          authorName: decodeHtmlEntities(track.artist) || lang?.artist || 'Исполнитель',
          authorImg: getImageUrl(getTrackArtwork(track), '/img/noimg.png'),
          contentSnippet: decodeHtmlEntities(track.title) || lang?.untitled || 'Без названия',
        },
      } : null,
    });
  }, [lang, resolveId]);

  const shareTrack = useCallback((track: PulseTrack) => {
    void copyTrackLink(track.sid ?? '', track);
  }, [copyTrackLink]);

  const shareModal = (
    <ShareModal
      copyLabel={lang?.copylink || 'Скопировать ссылку'}
      isOpen={share !== null}
      onClose={() => setShare(null)}
      onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success', 3)}
      onCopyFailed={() => showPulseNote(share?.url ?? '', 'info', 5)}
      shareUrl={share?.url ?? ''}
      title={lang?.share || 'Поделиться'}
      attachmentWidgets={share?.attachment?.widgets}
      attachmentPreview={share?.attachment?.preview}
    />
  );

  return { copyTrackLink, shareTrack, shareModal };
}
