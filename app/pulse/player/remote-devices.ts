'use client';

import { useSyncExternalStore } from 'react';

import { globalWS } from '../../lib/global-ws';
import { isInstalledApp } from '../../lib/platform';
import { resolveReclaim } from './device-reclaim';
import type { PulseCollectionKind, PulseTrack } from './pulse-player-types';

/** Опорная точка от играющего устройства, даже если ничего не менялось. */
export const DEVICE_STATE_INTERVAL_MS = 10_000;
/** Идентификатор устройства переживает перезагрузку: вкладки одного браузера — одно устройство. */
const DEVICE_ID_KEY = 'pulse_device_id';
/** Сколько ждём список устройств после переподключения, прежде чем решать без него. */
const RECLAIM_WAIT_MS = 4_000;
/** Сколько после своего claim не верим спискам «звук не у нас»: они могли уйти до его обработки. */
const CLAIM_SETTLE_MS = 3_000;

export type RemoteDeviceKind = 'desktop' | 'mobile';

export type RemoteDevice = {
  /** Играет ли звук на этом устройстве. */
  active: boolean;
  id: string;
  kind: RemoteDeviceKind;
  name: string;
  /** Это устройство, за которым человек сидит сейчас. */
  self: boolean;
};

export type RemotePlaybackState = {
  durationMs: number;
  /** Позиция в очереди — чтобы пульт показывал тот же трек. */
  index: number;
  playing: boolean;
  positionMs: number;
  /** Момент прихода по локальным часам: от него считаем, сколько трек уже проиграл. */
  receivedAt: number;
  trackId: string;
};

export type RemoteQueue = {
  /** «Чистый» идентификатор для повторного запроса коллекции. */
  collectionId: string;
  /** Ключ коллекции в плеере (artist_12, radio_5, -5) — по нему подсвечиваются страницы. */
  collectionKey: string;
  index: number;
  isPlaylist: boolean;
  kind: PulseCollectionKind | '';
  /** Приходит, только если очередь нельзя пересобрать по коллекции (перемешивание, правки, радио). */
  tracks: PulseTrack[] | null;
};

export type RemoteDevicesSnapshot = {
  activeDeviceId: string;
  /** Сколько соединений у аккаунта: две вкладки одного браузера — одно устройство, но два слушателя. */
  connections: number;
  devices: RemoteDevice[];
  /** Звук принадлежит именно этому соединению. */
  isActiveSelf: boolean;
  /** Играет другое устройство (или другая вкладка) — мы пульт. */
  isRemote: boolean;
  state: RemotePlaybackState | null;
};

export type RemoteCommand = {
  action:
    | 'close'
    | 'next'
    | 'pause'
    | 'play'
    | 'play_collection'
    | 'prev'
    | 'queue_index'
    | 'queue_move'
    | 'queue_next'
    | 'queue_remove'
    | 'seek'
    | 'takeover';
  /** Подробности команды — сейчас только для запуска коллекции. */
  params: Record<string, unknown> | null;
  value: number;
};

type StoreListener = () => void;

const EMPTY_SNAPSHOT: RemoteDevicesSnapshot = {
  activeDeviceId: '',
  connections: 0,
  devices: [],
  isActiveSelf: false,
  isRemote: false,
  state: null,
};

let snapshot: RemoteDevicesSnapshot = EMPTY_SNAPSHOT;
let deviceId = '';
let deviceName = '';
let deviceKind: RemoteDeviceKind = 'desktop';
let bridgeReady = false;
let announced = false;
const storeListeners = new Set<StoreListener>();

let commandHandler: ((command: RemoteCommand) => void) | null = null;
let queueHandler: ((queue: RemoteQueue) => void) | null = null;
let stopHandler: (() => void) | null = null;
let syncHandler: (() => void) | null = null;
let unreachableHandler: (() => void) | null = null;
let releasedHandler: (() => void) | null = null;
/** Играет ли звук здесь прямо сейчас (аудиоэлемент не на паузе) — сообщает плеер. */
let localPlaybackProbe: () => boolean = () => false;

/**
 * Мы были играющим устройством, а сокет оборвался. Забирать звук обратно вслепую нельзя:
 * пока нас не было, его мог забрать телефон/ПК, и мы бы поставили его на паузу. Решаем
 * по первому списку устройств после переподключения (см. resolveReclaim).
 */
let reclaimPending = false;
let reclaimTimer: ReturnType<typeof setTimeout> | null = null;

/** До этого момента ждём подтверждения своего claim (0 — не ждём). */
let claimPendingUntil = 0;

function sendClaim() {
  claimPendingUntil = Date.now() + CLAIM_SETTLE_MS;
  globalWS.send({ type: 'device:claim' });
}

function clearReclaim() {
  reclaimPending = false;
  if (reclaimTimer !== null) {
    clearTimeout(reclaimTimer);
    reclaimTimer = null;
  }
}


function setSnapshot(next: Partial<RemoteDevicesSnapshot>) {
  const merged = { ...snapshot, ...next };
  // Пультом считаемся только если есть ЖИВОЕ активное устройство в списке. Призрачный
  // activeDeviceId (устройство отключилось, а 20-секундный grace ещё держит его id) — не пульт,
  // иначе play уходил бы командой в никуда («Устройство недоступно»).
  const hasLiveActive = merged.devices.some((device) => device.active);
  snapshot = { ...merged, isRemote: merged.activeDeviceId !== '' && !merged.isActiveSelf && hasLiveActive };
  storeListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[PulseDevices] Store listener failed', error);
    }
  });
}

function readPayload(payload: unknown) {
  return (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
}

function readData(payload: unknown) {
  const envelope = readPayload(payload);
  return readPayload(envelope.data ?? envelope);
}

function createDeviceId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // ниже — запасной вариант
  }
  return `d${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Имя устройства собираем из user-agent: в БД ничего не храним, человек ничего не настраивает. */
function detectDevice() {
  if (deviceId || typeof window === 'undefined') return;

  try {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY);
    deviceId = stored && stored.length > 3 ? stored : createDeviceId();
    if (deviceId !== stored) window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch {
    // приватный режим — идентификатор живёт до перезагрузки вкладки
    deviceId = deviceId || createDeviceId();
  }

  const ua = navigator.userAgent || '';
  const isTouch = /android|iphone|ipad|ipod|mobile/i.test(ua);
  deviceKind = isTouch ? 'mobile' : 'desktop';

  const platform = /iphone|ipod/i.test(ua)
    ? 'iPhone'
    : /ipad/i.test(ua)
      ? 'iPad'
      : /android/i.test(ua)
        ? 'Android'
        : /windows/i.test(ua)
          ? 'Windows'
          : /mac os/i.test(ua)
            ? 'Mac'
            : /linux/i.test(ua)
              ? 'Linux'
              : '';
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\/|opera/i.test(ua)
      ? 'Opera'
      : /firefox|fxios/i.test(ua)
        ? 'Firefox'
        : /chrome|crios/i.test(ua)
          ? 'Chrome'
          : /safari/i.test(ua)
            ? 'Safari'
            : '';

  // Установленное приложение (наша сборка или PWA) — это Zypo, а не браузер, на котором оно работает.
  deviceName = isInstalledApp()
    ? [platform, 'Zypo'].filter(Boolean).join(' · ')
    : [platform, browser].filter(Boolean).join(' · ');
  if (!deviceName) deviceName = isTouch ? 'Смартфон' : 'Компьютер';
}

function parseDevices(raw: unknown): RemoteDevice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const device = readPayload(item);
      const id = String(device.id ?? '');
      return {
        active: Boolean(device.active),
        id,
        kind: device.kind === 'mobile' ? ('mobile' as const) : ('desktop' as const),
        name: String(device.name ?? ''),
        self: id === deviceId,
      };
    })
    .filter((device) => device.id !== '');
}

/** Подписка на события сокета — один раз за жизнь вкладки. */
function ensureBridge() {
  if (bridgeReady) return;
  bridgeReady = true;
  detectDevice();

  globalWS.addDialogListener('device:list', (payload) => {
    const data = readData(payload);
    const activeDeviceId = String(data.active_device_id ?? '');
    const activeSelf = Boolean(data.active_self);
    const wasPlaying = Boolean(snapshot.state?.playing);
    const next: Partial<RemoteDevicesSnapshot> = {
      activeDeviceId,
      connections: Math.max(0, Number(data.connections) || 0),
      devices: parseDevices(data.devices),
      isActiveSelf: activeSelf,
      // Звук нигде не играет — прошлое состояние пульта показывать нечему.
      state: activeDeviceId === '' ? null : snapshot.state,
    };

    if (claimPendingUntil) {
      if (activeSelf || Date.now() > claimPendingUntil) {
        claimPendingUntil = 0;
      } else {
        // Список ушёл до того, как сервер принял наш claim: звук по-прежнему наш, пультом не становимся.
        setSnapshot({ ...next, activeDeviceId: deviceId, isActiveSelf: true, state: null });
        notifyClock(wasPlaying);
        return;
      }
    }

    if (reclaimPending) {
      clearReclaim();
      const decision = resolveReclaim({
        activeDeviceId,
        activeSelf,
        ownDeviceId: deviceId,
        playingHere: localPlaybackProbe(),
      });
      if (decision === 'claim') {
        // Остаёмся играющим без промежуточного «мы пульт»: иначе плеер успел бы поставить себя на паузу.
        setSnapshot({ ...next, activeDeviceId: deviceId, isActiveSelf: true, state: null });
        notifyClock(wasPlaying);
        sendClaim();
        return;
      }
      if (decision === 'yield') {
        setSnapshot(next);
        notifyClock(wasPlaying);
        stopHandler?.();
        return;
      }
    }

    const wasRemote = snapshot.isRemote;
    setSnapshot(next);
    notifyClock(wasPlaying);
    // Мы были пультом, а звука на аккаунте больше нет (играющее устройство закрыло плеер) —
    // закрываем плеер и здесь: показывать и переключать больше нечего.
    if (wasRemote && activeDeviceId === '') releasedHandler?.();
  });

  globalWS.addDialogListener('device:state', (payload) => {
    const data = readData(payload);
    const wasPlaying = Boolean(snapshot.state?.playing);
    setSnapshot({
      state: {
        durationMs: Math.max(0, Number(data.duration_ms) || 0),
        index: Math.max(0, Number(data.index) || 0),
        playing: Boolean(data.playing),
        positionMs: Math.max(0, Number(data.position_ms) || 0),
        receivedAt: Date.now(),
        trackId: String(data.track_id ?? ''),
      },
    });
    notifyClock(wasPlaying);
  });

  globalWS.addDialogListener('device:queue', (payload) => {
    const data = readData(payload);
    const rawTracks = data.tracks;
    queueHandler?.({
      collectionId: String(data.collection_id ?? ''),
      collectionKey: String(data.collection_key ?? ''),
      index: Math.max(0, Number(data.index) || 0),
      isPlaylist: Boolean(data.is_playlist),
      kind: (String(data.kind ?? '') || '') as PulseCollectionKind | '',
      tracks: Array.isArray(rawTracks) ? (rawTracks as PulseTrack[]) : null,
    });
  });

  globalWS.addDialogListener('device:command', (payload) => {
    const data = readData(payload);
    const action = String(data.action ?? '');
    if (!action) return;
    commandHandler?.({
      action: action as RemoteCommand['action'],
      params: data.params && typeof data.params === 'object' ? (data.params as Record<string, unknown>) : null,
      value: Number(data.value) || 0,
    });
  });

  globalWS.addDialogListener('device:stop', (payload) => {
    const data = readData(payload);
    const activeId = String(data.device_id ?? '');
    // Звук забрали явно — ждать подтверждения своего claim больше нечего.
    claimPendingUntil = 0;
    clearReclaim();
    // Помечаем себя пультом до остановки звука: пауза не должна уехать тем, кто слушает вместе.
    setSnapshot({ activeDeviceId: activeId || snapshot.activeDeviceId, isActiveSelf: false });
    stopHandler?.();
  });

  // Команду некому исполнить: устройство ушло, а мы всё ещё показываем его играющим.
  globalWS.addDialogListener('device:unreachable', () => {
    unreachableHandler?.();
  });

  // Подключилось новое устройство — оно ждёт очередь и позицию, а не следующей опорной точки.
  globalWS.addDialogListener('device:sync', () => {
    syncHandler?.();
  });

  // После обрыва связи заново представляемся, иначе нас не будет в списке устройств.
  globalWS.addDialogListener('auth_ok', () => {
    clearReclaim();
    // Телефон теряет сокет при каждом уходе в фон, а музыка играет дальше: звук возвращаем себе,
    // но только если за время обрыва его не забрало другое устройство — это покажет список.
    if (snapshot.isActiveSelf) {
      reclaimPending = true;
      reclaimTimer = setTimeout(() => {
        // Список так и не пришёл: забираем звук, только если он реально играет здесь.
        if (!reclaimPending) return;
        clearReclaim();
        if (localPlaybackProbe()) sendClaim();
      }, RECLAIM_WAIT_MS);
    }
    announced = false;
    announceDevice();
  });
}

export function subscribeRemoteDevices(listener: StoreListener) {
  ensureBridge();
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export function getRemoteDevicesSnapshot() {
  return snapshot;
}

export function getServerRemoteDevicesSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function useRemoteDevices() {
  return useSyncExternalStore(subscribeRemoteDevices, getRemoteDevicesSnapshot, getServerRemoteDevicesSnapshot);
}

/** Звук идёт на другом устройстве или в другой вкладке — читаем из стора, он свежее рефов. */
export function isRemotePlayback() {
  return snapshot.isRemote;
}

/** Есть кому показывать состояние и очередь: другая вкладка считается так же, как другое устройство. */
export function hasOtherDevices() {
  return snapshot.connections > 1 || snapshot.devices.length > 1;
}

export function announceDevice() {
  ensureBridge();
  if (announced || !deviceId) return;
  announced = true;
  globalWS.send({ type: 'device:hello', device_id: deviceId, kind: deviceKind, name: deviceName });
}

/** Здесь начали играть — звук на остальных устройствах аккаунта гасим. */
export function claimActiveDevice() {
  ensureBridge();
  // Нажали play, пока решалось, наш ли ещё звук после переподключения: теперь точно наш.
  const wasReclaiming = reclaimPending;
  clearReclaim();
  if (snapshot.isActiveSelf && !wasReclaiming) return;
  announceDevice();
  // Ждать ответа сервера нельзя: контролы должны сразу работать как локальные.
  setSnapshot({ activeDeviceId: deviceId, isActiveSelf: true, state: null });
  sendClaim();
}

/** Плеер закрыли — звука на аккаунте больше нет, пультам показывать нечего. */
export function releaseActiveDevice() {
  clearReclaim();
  claimPendingUntil = 0;
  if (!snapshot.isActiveSelf) return;
  setSnapshot({ activeDeviceId: '', isActiveSelf: false, state: null });
  globalWS.send({ type: 'device:release' });
}

export function sendDeviceState(state: {
  durationMs: number;
  index: number;
  playing: boolean;
  positionMs: number;
  trackId: number | string;
}) {
  globalWS.send({
    type: 'device:state',
    duration_ms: Math.max(0, Math.round(state.durationMs)),
    index: Math.max(0, Math.round(state.index)),
    playing: state.playing,
    position_ms: Math.max(0, Math.round(state.positionMs)),
    track_id: String(state.trackId ?? ''),
  });
}

/**
 * Очередь для пультов. Обычно хватает описания коллекции — список каждый соберёт сам
 * (он лежит в кэше). Треки шлём, только когда очередь уже не совпадает с коллекцией.
 */
export function sendDeviceQueue(queue: {
  collectionId: string;
  collectionKey: string;
  index: number;
  isPlaylist: boolean;
  kind: string;
  tracks: PulseTrack[] | null;
}) {
  globalWS.send({
    type: 'device:queue',
    collection_id: queue.collectionId,
    collection_key: queue.collectionKey,
    index: Math.max(0, Math.round(queue.index)),
    is_playlist: queue.isPlaylist,
    kind: queue.kind,
    tracks: queue.tracks,
  });
}

export function sendDeviceCommand(action: RemoteCommand['action'], value = 0, params: Record<string, unknown> | null = null) {
  globalWS.send({ type: 'device:command', action, params, value });
}

/** «Играть там»: звук забирает названное устройство — оно уже знает очередь и позицию. */
export function sendTakeoverCommand(targetDeviceId: string) {
  if (!targetDeviceId || targetDeviceId === deviceId) return;
  globalWS.send({ type: 'device:command', action: 'takeover', target_device_id: targetDeviceId, value: 0 });
}

export function setDeviceCommandHandler(handler: ((command: RemoteCommand) => void) | null) {
  commandHandler = handler;
}

export function setDeviceQueueHandler(handler: ((queue: RemoteQueue) => void) | null) {
  queueHandler = handler;
}

export function setDeviceStopHandler(handler: (() => void) | null) {
  stopHandler = handler;
}

export function setDeviceSyncHandler(handler: (() => void) | null) {
  syncHandler = handler;
}

export function setDeviceUnreachableHandler(handler: (() => void) | null) {
  unreachableHandler = handler;
}

export function setDeviceReleasedHandler(handler: (() => void) | null) {
  releasedHandler = handler;
}

export function setDeviceLocalPlaybackProbe(probe: (() => boolean) | null) {
  localPlaybackProbe = probe ?? (() => false);
}

/**
 * Часы удалённого воспроизведения для текста песни: тот же интерфейс, что у аудио,
 * только время берётся из состояния играющего устройства.
 */
class RemotePlaybackClock extends EventTarget {
  get currentTime() {
    return snapshot.state ? getRemotePositionMs(snapshot.state) / 1000 : 0;
  }

  get paused() {
    return !snapshot.state?.playing;
  }
}

const remoteClock = new RemotePlaybackClock();

/** Подставляется вместо аудиоэлемента там, где звук идёт на другом устройстве. */
export const remotePlaybackClockRef = { current: remoteClock };

function notifyClock(wasPlaying: boolean) {
  const isPlaying = Boolean(snapshot.state?.playing);
  // Строка текста должна перестроиться и на паузе, поэтому «перемотку» шлём всегда.
  remoteClock.dispatchEvent(new Event(isPlaying === wasPlaying ? 'seeked' : isPlaying ? 'play' : 'pause'));
}

/** Где играющее устройство сейчас: позиция плюс время, прошедшее с прихода состояния. */
export function getRemotePositionMs(state: RemotePlaybackState, now = Date.now()) {
  if (!state.playing) return state.positionMs;
  return state.positionMs + Math.max(0, now - state.receivedAt);
}
