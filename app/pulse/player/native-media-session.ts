import { Capacitor } from '@capacitor/core';

import { SITE_URL } from '../../config';
import { isBackendPath, toBackendUrl } from '../../lib/api-url';
import { IS_NATIVE_APP, NATIVE_MEDIA_SESSION_READY_EVENT } from '../../lib/platform';

type NativeMediaSessionPlugin = typeof import('@capgo/capacitor-media-session')['MediaSession'];
type NativeAction = Parameters<NativeMediaSessionPlugin['setActionHandler']>[0]['action'];

const NATIVE_ACTIONS: readonly string[] = ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'seekto', 'stop'];

let installed = false;

/** Обложку плагин качает сам по http(s): blob: и внутренний https://localhost ему недоступны. */
function toNativeArtwork(artwork: readonly MediaImage[] | undefined) {
  const candidates = (artwork ?? [])
    .map((item) => {
      const src = String(item?.src ?? '').trim();
      if (!src || src.startsWith('blob:')) return null;
      let absolute = src;
      try {
        const url = new URL(src, window.location.href);
        if (url.origin === window.location.origin) {
          const path = `${url.pathname}${url.search}`;
          absolute = isBackendPath(path) ? toBackendUrl(path) : `${SITE_URL}${path}`;
        } else {
          absolute = url.href;
        }
      } catch {
        return null;
      }
      const size = Number.parseInt(String(item?.sizes ?? '').split('x')[0], 10) || 0;
      return { size, src: absolute, type: item?.type };
    })
    .filter((item): item is { size: number; src: string; type: string | undefined } => item !== null);
  // Плагину достаточно одной картинки — самая крупная до 512px (уведомлению больше не нужно).
  const best = candidates.filter((item) => item.size <= 512).sort((a, b) => b.size - a.size)[0] ?? candidates[0];
  return best ? [{ src: best.src, type: best.type }] : [];
}

/**
 * Приложение: navigator.mediaSession плеера Pulse → нативная медиасессия (@capgo/capacitor-media-session).
 * Плагин поднимает foreground-сервис с медиауведомлением: музыка играет при свёрнутом приложении и
 * заблокированном экране, управление — из шторки и с экрана блокировки. Код плеера не меняется:
 * он уже ведёт MediaSession для сайта, здесь те же вызовы уходят в плагин.
 */
export function installNativeMediaSession() {
  if (!IS_NATIVE_APP || installed || typeof navigator === 'undefined') return;
  // Только на устройстве: веб-реализация плагина сама пишет в navigator.mediaSession —
  // подмена в браузере замкнулась бы сама на себя.
  if (!Capacitor.isNativePlatform()) return;
  installed = true;

  // В Android WebView нет Media Session API: ни navigator.mediaSession (его подставляет мост ниже),
  // ни конструктора MediaMetadata. Плеер пишет метаданные только при наличии MediaMetadata — без
  // него уведомление оставалось с кнопками, но без названия, исполнителя и обложки.
  if (typeof window.MediaMetadata === 'undefined') {
    class NativeMediaMetadata {
      title: string;
      artist: string;
      album: string;
      artwork: readonly MediaImage[];

      constructor(init: MediaMetadataInit = {}) {
        this.title = init.title ?? '';
        this.artist = init.artist ?? '';
        this.album = init.album ?? '';
        this.artwork = init.artwork ?? [];
      }
    }
    Object.defineProperty(window, 'MediaMetadata', { configurable: true, writable: true, value: NativeMediaMetadata });
  }

  // Промис держит модуль, а не сам плагин: прокси Capacitor на любое свойство (в т.ч. then) отвечает
  // вызовом натива, и промис с плагином внутри «разрешался» бы вызовом несуществующего метода.
  const pluginModule = import('@capgo/capacitor-media-session');
  const call = (run: (native: NativeMediaSessionPlugin) => Promise<void>) => {
    pluginModule
      .then((module) => run(module.MediaSession))
      .catch((error: unknown) => console.error('[MediaSession] native call failed', error));
  };

  let metadata: MediaMetadata | null = null;
  let playbackState: MediaSessionPlaybackState = 'none';

  const shim = {
    get metadata() {
      return metadata;
    },
    set metadata(value: MediaMetadata | null) {
      metadata = value;
      call((native) => native.setMetadata({
        album: value?.album ?? '',
        artist: value?.artist ?? '',
        artwork: toNativeArtwork(value?.artwork),
        title: value?.title ?? '',
      }));
    },
    get playbackState() {
      return playbackState;
    },
    set playbackState(value: MediaSessionPlaybackState) {
      playbackState = value;
      call((native) => native.setPlaybackState({ playbackState: value }));
    },
    setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
      // Действий вне списка плагина (skipad, hangup…) плеер не использует — молча пропускаем.
      if (!NATIVE_ACTIONS.includes(action)) return;
      call((native) => native.setActionHandler(
        { action: action as NativeAction },
        handler
          ? (details) => handler({ action, seekTime: details.seekTime ?? undefined } as MediaSessionActionDetails)
          : null,
      ));
    },
    setPositionState(state?: MediaPositionState) {
      if (!state) return;
      call((native) => native.setPositionState({
        duration: Number.isFinite(state.duration) ? state.duration : undefined,
        playbackRate: state.playbackRate,
        position: state.position,
      }));
    },
    setCameraActive() {},
    setMicrophoneActive() {},
  };

  // Мост ставится не мгновенно (AppRuntime грузится лениво), а плеер при запуске восстанавливает
  // последний трек и сразу пишет метаданные в настоящую медиасессию WebView. Без переноса плагин
  // получал бы только play/pause — уведомление с кнопками, но без названия, исполнителя и обложки.
  const previous = navigator.mediaSession;

  try {
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, get: () => shim });
  } catch (error) {
    console.error('[MediaSession] failed to install native bridge', error);
    return;
  }

  if (previous?.metadata) shim.metadata = previous.metadata;
  if (previous && previous.playbackState !== 'none') shim.playbackState = previous.playbackState;
  // Плеер мог восстановить трек раньше, чем появились мост и MediaMetadata, и пропустить метаданные.
  window.dispatchEvent(new Event(NATIVE_MEDIA_SESSION_READY_EVENT));
}
