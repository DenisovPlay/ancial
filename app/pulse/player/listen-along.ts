'use client';

import { useSyncExternalStore } from 'react';

import { globalWS } from '../../lib/global-ws';

/** Расхождение больше этого — резкий переход к позиции хоста. */
export const LISTEN_HARD_SEEK_MS = 2000;
/** Меньше этого — считаем, что идём вместе, и ничего не трогаем. */
export const LISTEN_IN_SYNC_MS = 150;
/** Небольшое расхождение подтягиваем скоростью в пределах ±3%: на слух незаметно, в отличие от скачка. */
export const LISTEN_RATE_WINDOW = 0.03;
/** Опорная точка от хоста, даже если ничего не менялось. */
export const LISTEN_STATE_INTERVAL_MS = 10_000;
/** Сколько ждём первое состояние после подключения, прежде чем считать, что хост недоступен. */
export const LISTEN_JOIN_TIMEOUT_MS = 8_000;

export type ListenAlongListener = {
  id: number;
  img: string;
  name: string;
};

export type ListenAlongState = {
  playing: boolean;
  positionMs: number;
  /** Момент прихода состояния по локальным часам: от него считаем, сколько трек уже проиграл. */
  receivedAt: number;
  trackId: string;
};

export type ListenAlongSnapshot = {
  /** Чьё прослушивание повторяем; 0 — своё. */
  followingHostId: number;
  /** Хост комнаты — чтобы ведомый видел, с кем слушает. */
  host: ListenAlongListener | null;
  /** Кто слушает вместе (у хоста — его слушатели, у ведомого — соседи по комнате). */
  listeners: ListenAlongListener[];
  /** Последнее состояние хоста — для ведомого. */
  state: ListenAlongState | null;
};

type StoreListener = () => void;

const EMPTY_SNAPSHOT: ListenAlongSnapshot = { followingHostId: 0, host: null, listeners: [], state: null };

let snapshot: ListenAlongSnapshot = EMPTY_SNAPSHOT;
let hostSyncRequestHandler: (() => void) | null = null;
let listenClosedHandler: ((info: { reason: string; wasFollowing: boolean }) => void) | null = null;
let bridgeReady = false;
const storeListeners = new Set<StoreListener>();

function setSnapshot(next: Partial<ListenAlongSnapshot>) {
  snapshot = { ...snapshot, ...next };
  storeListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[ListenAlong] Store listener failed', error);
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

function parseListeners(raw: unknown): ListenAlongListener[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const listener = readPayload(item);
      return {
        id: Number(listener.id) || 0,
        img: String(listener.img ?? ''),
        name: String(listener.name ?? ''),
      };
    })
    .filter((listener) => listener.id > 0);
}

/** Подписка на события сокета — один раз за жизнь вкладки. */
function ensureBridge() {
  if (bridgeReady) return;
  bridgeReady = true;

  globalWS.addDialogListener('listen:state', (payload) => {
    const data = readData(payload);
    const hostId = Number(data.host_id) || 0;
    if (!hostId || hostId !== snapshot.followingHostId) return;

    setSnapshot({
      state: {
        playing: Boolean(data.playing),
        positionMs: Math.max(0, Number(data.position_ms) || 0),
        receivedAt: Date.now(),
        trackId: String(data.track_id ?? ''),
      },
    });
  });

  globalWS.addDialogListener('listen:listeners', (payload) => {
    const data = readData(payload);
    const host = parseListeners([data.host])[0] ?? null;
    const hostId = Number(data.host_id) || 0;
    // В комнату входит человек, а не вкладка: остальные его устройства узнают об этом отсюда.
    // Иначе пульт не знал бы, что аккаунт кого-то слушает, и не блокировал бы контролы.
    const following = data.role === 'listener' && hostId > 0;

    setSnapshot({
      host,
      listeners: parseListeners(data.listeners),
      ...(following ? { followingHostId: hostId } : {}),
    });
    // Пришёл новый слушатель — хосту нужно немедленно отдать текущее состояние.
    if (data.sync) hostSyncRequestHandler?.();
  });

  globalWS.addDialogListener('listen:closed', (payload) => {
    const data = readData(payload);
    const hostId = Number(data.host_id) || 0;
    const wasFollowing = snapshot.followingHostId > 0 && (!hostId || hostId === snapshot.followingHostId);
    // Событие приходит обеим сторонам: слушателю — что хост ушёл, хосту — что его комнаты больше нет.
    if (snapshot.followingHostId > 0 && !wasFollowing) return;

    setSnapshot({ followingHostId: 0, host: null, listeners: [], state: null });
    listenClosedHandler?.({ reason: String(data.reason ?? ''), wasFollowing });
  });

  // После обрыва связи заново входим в комнату, иначе остались бы «подключены» только на словах.
  globalWS.addDialogListener('auth_ok', () => {
    if (snapshot.followingHostId > 0) {
      globalWS.send({ type: 'listen:join', host_id: snapshot.followingHostId });
    }
  });
}

export function subscribeListenAlong(listener: StoreListener) {
  ensureBridge();
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export function getListenAlongSnapshot() {
  return snapshot;
}

export function getServerListenAlongSnapshot() {
  return EMPTY_SNAPSHOT;
}

const getIsFollower = () => snapshot.followingHostId > 0;
const getServerIsFollower = () => false;

/** Ведомый не управляет воспроизведением — контролы читают это сами, без лишних пропсов. */
export function useIsListenFollower() {
  return useSyncExternalStore(subscribeListenAlong, getIsFollower, getServerIsFollower);
}

/** Хост отдаёт состояние по запросу сервера (подключился новый слушатель). */
export function setHostSyncRequestHandler(handler: (() => void) | null) {
  hostSyncRequestHandler = handler;
}

/** Комната закрылась (хост ушёл или закрыл плеер) — чтобы плеер мог сказать об этом человеку. */
export function setListenClosedHandler(handler: ((info: { reason: string; wasFollowing: boolean }) => void) | null) {
  listenClosedHandler = handler;
}

export function joinListenAlong(hostId: number | string) {
  const id = Number(hostId) || 0;
  if (id <= 0) return;

  ensureBridge();
  setSnapshot({ followingHostId: id, state: null });
  globalWS.send({ type: 'listen:join', host_id: id });
}

export function leaveListenAlong() {
  const hostId = snapshot.followingHostId;
  setSnapshot({ followingHostId: 0, host: null, listeners: [], state: null });
  if (hostId > 0) globalWS.send({ type: 'listen:leave', host_id: hostId });
}

/** Хост закрыл плеер — распускаем комнату, слушателям приходит «комната закрыта». */
export function closeListenAlongRoom() {
  setSnapshot({ host: null, listeners: [], state: null });
  globalWS.send({ type: 'listen:close' });
}

/** Вернулись из фона: таймеры стояли, сокет мог умереть — поднимаем связь. */
export function resumeListenAlong() {
  if (!globalWS.isConnected()) globalWS.reconnect();
}

export function sendListenState(state: { playing: boolean; positionMs: number; trackId: number | string }) {
  globalWS.send({
    type: 'listen:state',
    track_id: String(state.trackId ?? ''),
    position_ms: Math.max(0, Math.round(state.positionMs)),
    playing: state.playing,
  });
}

/** Где хост находится сейчас: позиция из состояния плюс время, прошедшее с момента его прихода. */
export function getTargetPositionMs(state: ListenAlongState, now = Date.now()) {
  if (!state.playing) return state.positionMs;
  return state.positionMs + Math.max(0, now - state.receivedAt);
}

/**
 * Насколько менять скорость, чтобы догнать хоста без рывка.
 * Возвращает 1, если расхождение в пределах нормы.
 */
export function getCatchUpRate(driftMs: number) {
  if (Math.abs(driftMs) <= LISTEN_IN_SYNC_MS) return 1;
  return driftMs > 0 ? 1 + LISTEN_RATE_WINDOW : 1 - LISTEN_RATE_WINDOW;
}
